/**
 * @fileoverview WhatsApp plugin worker — handles webhooks, events, jobs,
 * tools, and the bridge between WhatsApp Business API and Paperclip issues.
 */
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import type { PluginContext, PluginEvent, PluginJobContext, ToolRunContext, ToolResult } from "@paperclipai/plugin-sdk";
import {
  JOB_KEYS,
  STATE_KEYS,
  TOOL_NAMES,
  WEBHOOK_KEYS,
} from "./constants.js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WhatsAppConfig {
  phoneNumberId?: string;
  businessAccountId?: string;
  accessTokenRef?: string;
  webhookVerifyToken?: string;
  defaultCompanyId?: string;
  defaultProjectId?: string;
  autoCreateIssues?: boolean;
  autoAssignAgent?: boolean;
  defaultAgentId?: string;
  welcomeMessage?: string;
}

interface PhoneToIssueEntry {
  issueId: string;
  companyId: string;
  lastMessageAt: string;
  contactName?: string;
}

interface PhoneToIssueMap {
  [phone: string]: PhoneToIssueEntry;
}

interface MessageStats {
  totalReceived: number;
  totalSent: number;
  activeConversations: number;
  lastReceivedAt: string | null;
  lastSentAt: string | null;
}

const EMPTY_STATS: MessageStats = {
  totalReceived: 0,
  totalSent: 0,
  activeConversations: 0,
  lastReceivedAt: null,
  lastSentAt: null,
};

/* ------------------------------------------------------------------ */
/*  WhatsApp Business API helpers                                      */
/* ------------------------------------------------------------------ */

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

async function sendWhatsAppMessage(
  ctx: PluginContext,
  config: WhatsAppConfig,
  to: string,
  text: string,
): Promise<{ messageId: string }> {
  const token = await ctx.secrets.resolve(config.accessTokenRef!);
  const url = `${GRAPH_API_BASE}/${config.phoneNumberId}/messages`;

  const response = await ctx.http.fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/[^0-9]/g, ""),
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WhatsApp API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as { messages?: Array<{ id: string }> };
  return { messageId: data.messages?.[0]?.id ?? "unknown" };
}

async function getPhoneMap(ctx: PluginContext): Promise<PhoneToIssueMap> {
  return ((await ctx.state.get({
    scopeKind: "instance",
    stateKey: STATE_KEYS.phoneToIssue,
  })) ?? {}) as PhoneToIssueMap;
}

async function setPhoneMap(ctx: PluginContext, map: PhoneToIssueMap): Promise<void> {
  await ctx.state.set(
    { scopeKind: "instance", stateKey: STATE_KEYS.phoneToIssue },
    map,
  );
}

async function getStats(ctx: PluginContext): Promise<MessageStats> {
  return ((await ctx.state.get({
    scopeKind: "instance",
    stateKey: STATE_KEYS.messageStats,
  })) ?? { ...EMPTY_STATS }) as MessageStats;
}

async function setStats(ctx: PluginContext, stats: MessageStats): Promise<void> {
  await ctx.state.set(
    { scopeKind: "instance", stateKey: STATE_KEYS.messageStats },
    stats,
  );
}

async function getConfig(ctx: PluginContext): Promise<WhatsAppConfig | null> {
  const raw = await ctx.config.get();
  if (!raw) return null;
  return raw as unknown as WhatsAppConfig;
}

/* ------------------------------------------------------------------ */
/*  Plugin definition                                                  */
/* ------------------------------------------------------------------ */

const plugin = definePlugin({
  async setup(ctx: PluginContext) {
    ctx.logger.info("WhatsApp plugin setup starting");

    /* ---- Event: relay agent/user comments back to WhatsApp ---- */

    ctx.events.on("issue.comment.created", async (event: PluginEvent) => {
      const payload = event.payload as {
        issueId?: string;
        authorAgentId?: string;
        authorUserId?: string;
        body?: string;
      };

      if (!payload.issueId || !payload.body) return;
      // Only relay comments from agents or board users, not from the plugin
      if (!payload.authorAgentId && !payload.authorUserId) return;

      const config = await getConfig(ctx);
      if (!config?.phoneNumberId || !config?.accessTokenRef) return;

      const phoneMap = await getPhoneMap(ctx);
      const entry = Object.entries(phoneMap).find(([, v]) => v.issueId === payload.issueId);
      if (!entry) return;

      const [phoneNumber] = entry;

      try {
        await sendWhatsAppMessage(ctx, config, phoneNumber, payload.body!);
        ctx.logger.info("Relayed comment to WhatsApp", { issueId: payload.issueId, phoneNumber });

        const stats = await getStats(ctx);
        stats.totalSent++;
        stats.lastSentAt = new Date().toISOString();
        await setStats(ctx, stats);
      } catch (err) {
        ctx.logger.error("Failed to relay comment to WhatsApp", {
          issueId: payload.issueId,
          phoneNumber,
          error: String(err),
        });
      }
    });

    /* ---- Job: periodic health check ---- */

    ctx.jobs.register(JOB_KEYS.healthCheck, async (_job: PluginJobContext) => {
      const config = await getConfig(ctx);
      if (!config?.phoneNumberId || !config?.accessTokenRef) {
        ctx.logger.warn("Health check skipped: plugin not configured");
        return;
      }

      try {
        const token = await ctx.secrets.resolve(config.accessTokenRef);
        const response = await ctx.http.fetch(
          `${GRAPH_API_BASE}/${config.phoneNumberId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.ok) {
          await ctx.state.set(
            { scopeKind: "instance", stateKey: STATE_KEYS.connectionStatus },
            { connected: true, checkedAt: new Date().toISOString() },
          );
          ctx.logger.info("WhatsApp health check passed");
        } else {
          const body = await response.text();
          await ctx.state.set(
            { scopeKind: "instance", stateKey: STATE_KEYS.connectionStatus },
            { connected: false, error: body, checkedAt: new Date().toISOString() },
          );
          ctx.logger.error("WhatsApp health check failed", { status: response.status, body });
        }
      } catch (err) {
        await ctx.state.set(
          { scopeKind: "instance", stateKey: STATE_KEYS.connectionStatus },
          { connected: false, error: String(err), checkedAt: new Date().toISOString() },
        );
        ctx.logger.error("WhatsApp health check error", { error: String(err) });
      }
    });

    /* ---- Tool: send WhatsApp message ---- */

    ctx.tools.register(
      TOOL_NAMES.sendMessage,
      {
        displayName: "Send WhatsApp Message",
        description: "Send a text message to a phone number via WhatsApp.",
        parametersSchema: {
          type: "object",
          properties: {
            phoneNumber: { type: "string", description: "Phone number in E.164 format." },
            message: { type: "string", description: "The text message to send." },
          },
          required: ["phoneNumber", "message"],
        },
      },
      async (params: unknown, _runCtx: ToolRunContext): Promise<ToolResult> => {
        const { phoneNumber, message } = params as { phoneNumber: string; message: string };
        const config = await getConfig(ctx);

        if (!config?.phoneNumberId || !config?.accessTokenRef) {
          return {
            content: "WhatsApp plugin is not configured. Ask the admin to set it up.",
            error: "not_configured",
          };
        }

        try {
          const result = await sendWhatsAppMessage(ctx, config, phoneNumber, message);
          return {
            content: `Message sent to ${phoneNumber} via WhatsApp (ID: ${result.messageId}).`,
            data: result,
          };
        } catch (err) {
          return {
            content: `Failed to send WhatsApp message: ${String(err)}`,
            error: String(err),
          };
        }
      },
    );

    /* ---- Tool: list conversations ---- */

    ctx.tools.register(
      TOOL_NAMES.listConversations,
      {
        displayName: "List WhatsApp Conversations",
        description: "List active WhatsApp conversations and their linked issues.",
        parametersSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Max conversations to return (default 20)." },
          },
        },
      },
      async (params: unknown): Promise<ToolResult> => {
        const limit = (params as { limit?: number }).limit ?? 20;

        const phoneMap = await getPhoneMap(ctx);
        const conversations = Object.entries(phoneMap)
          .sort(([, a], [, b]) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""))
          .slice(0, limit)
          .map(([phone, data]) => ({
            phoneNumber: phone,
            contactName: data.contactName ?? null,
            issueId: data.issueId,
            companyId: data.companyId,
            lastMessageAt: data.lastMessageAt,
          }));

        return {
          content: conversations.length
            ? `Found ${conversations.length} active WhatsApp conversation(s):\n${conversations.map((c) => `- ${c.contactName ?? c.phoneNumber} -> Issue ${c.issueId}`).join("\n")}`
            : "No active WhatsApp conversations.",
          data: { conversations },
        };
      },
    );

    /* ---- Bridge data handlers (for UI) ---- */

    ctx.data.register("whatsapp-stats", async () => {
      const stats = await getStats(ctx);
      const connectionStatus = (await ctx.state.get({
        scopeKind: "instance",
        stateKey: STATE_KEYS.connectionStatus,
      })) as { connected?: boolean; checkedAt?: string; error?: string } | null;

      return { stats, connectionStatus };
    });

    ctx.data.register("whatsapp-conversations", async (params: Record<string, unknown>) => {
      const limit = (params.limit as number | undefined) ?? 50;

      const phoneMap = await getPhoneMap(ctx);
      const conversations = Object.entries(phoneMap)
        .sort(([, a], [, b]) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""))
        .slice(0, limit)
        .map(([phone, data]) => ({
          phoneNumber: phone,
          ...data,
        }));

      return { conversations };
    });

    ctx.logger.info("WhatsApp plugin setup complete");
  },

  async onHealth() {
    return { status: "ok", message: "WhatsApp plugin is running" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
