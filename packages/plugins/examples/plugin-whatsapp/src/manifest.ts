import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import {
  DEFAULT_CONFIG,
  EXPORT_NAMES,
  JOB_KEYS,
  PAGE_ROUTE,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SLOT_IDS,
  TOOL_NAMES,
  WEBHOOK_KEYS,
} from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "WhatsApp",
  description:
    "Connect WhatsApp Business API to Paperclip. Incoming WhatsApp messages create or update issues, and agent replies are sent back through WhatsApp automatically.",
  author: "Paperclip",
  categories: ["connector", "automation"],

  capabilities: [
    // Core issue/comment operations for message bridging
    "issues.read",
    "issues.create",
    "issues.update",
    "issue.comments.read",
    "issue.comments.create",

    // Agent interaction
    "agents.read",
    "agents.invoke",
    "agent.sessions.create",
    "agent.sessions.send",

    // Company/project context
    "companies.read",
    "projects.read",

    // Plugin infrastructure
    "plugin.state.read",
    "plugin.state.write",
    "events.subscribe",
    "events.emit",
    "webhooks.receive",
    "http.outbound",
    "secrets.read-ref",
    "jobs.schedule",
    "activity.log.write",

    // Agent tools
    "agent.tools.register",

    // UI surfaces
    "ui.page.register",
    "ui.sidebar.register",
    "ui.dashboardWidget.register",
    "instance.settings.register",
  ],

  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },

  instanceConfigSchema: {
    type: "object",
    properties: {
      phoneNumberId: {
        type: "string",
        title: "Phone Number ID",
        description: "Your WhatsApp Business API phone number ID from Meta.",
      },
      businessAccountId: {
        type: "string",
        title: "Business Account ID",
        description: "Your WhatsApp Business Account ID.",
      },
      accessTokenRef: {
        type: "string",
        title: "Access Token (Secret Ref)",
        description:
          "Reference to the stored secret containing your permanent access token. Use the Secrets manager to create one first.",
      },
      webhookVerifyToken: {
        type: "string",
        title: "Webhook Verify Token",
        description:
          "A random string you choose. Meta sends this during webhook verification — it must match exactly.",
      },
      defaultCompanyId: {
        type: "string",
        title: "Default Company",
        description: "Company ID where new WhatsApp conversations will create issues.",
      },
      defaultProjectId: {
        type: "string",
        title: "Default Project",
        description: "Project ID for new issues. Leave blank to use company default.",
      },
      autoCreateIssues: {
        type: "boolean",
        title: "Auto-Create Issues",
        description: "Automatically create an issue when a new phone number sends a message.",
        default: DEFAULT_CONFIG.autoCreateIssues,
      },
      autoAssignAgent: {
        type: "boolean",
        title: "Auto-Assign Agent",
        description: "Automatically assign the default agent to new WhatsApp conversations.",
        default: DEFAULT_CONFIG.autoAssignAgent,
      },
      defaultAgentId: {
        type: "string",
        title: "Default Agent ID",
        description: "Agent to auto-assign new WhatsApp conversations to.",
      },
      welcomeMessage: {
        type: "string",
        title: "Welcome Message",
        description: "Message sent to first-time contacts.",
        default: DEFAULT_CONFIG.welcomeMessage,
      },
    },
    required: ["phoneNumberId", "accessTokenRef", "webhookVerifyToken"],
  },

  webhooks: [
    {
      endpointKey: WEBHOOK_KEYS.inbound,
      displayName: "WhatsApp Inbound Messages",
      description:
        "Receives messages and status updates from the WhatsApp Business API. Configure this URL in your Meta App webhook settings.",
    },
    {
      endpointKey: WEBHOOK_KEYS.status,
      displayName: "WhatsApp Delivery Status",
      description: "Receives delivery/read receipts from WhatsApp.",
    },
  ],

  jobs: [
    {
      jobKey: JOB_KEYS.healthCheck,
      displayName: "Connection Health Check",
      description: "Verifies the WhatsApp Business API connection is alive.",
      schedule: "*/30 * * * *",
    },
  ],

  tools: [
    {
      name: TOOL_NAMES.sendMessage,
      displayName: "Send WhatsApp Message",
      description:
        "Send a text message to a phone number via WhatsApp. Use this when the user's task requires notifying someone on WhatsApp.",
      parametersSchema: {
        type: "object",
        properties: {
          phoneNumber: {
            type: "string",
            description: "Phone number in E.164 format (e.g. +1234567890).",
          },
          message: {
            type: "string",
            description: "The text message to send.",
          },
        },
        required: ["phoneNumber", "message"],
      },
    },
    {
      name: TOOL_NAMES.listConversations,
      displayName: "List WhatsApp Conversations",
      description: "List active WhatsApp conversations and their linked issues.",
      parametersSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max conversations to return (default 20).",
          },
        },
      },
    },
  ],

  ui: {
    slots: [
      {
        type: "page",
        id: SLOT_IDS.page,
        displayName: "WhatsApp",
        exportName: EXPORT_NAMES.page,
        routePath: PAGE_ROUTE,
      },
      {
        type: "settingsPage",
        id: SLOT_IDS.settingsPage,
        displayName: "WhatsApp Settings",
        exportName: EXPORT_NAMES.settingsPage,
      },
      {
        type: "sidebar",
        id: SLOT_IDS.sidebar,
        displayName: "WhatsApp",
        exportName: EXPORT_NAMES.sidebar,
      },
      {
        type: "dashboardWidget",
        id: SLOT_IDS.dashboardWidget,
        displayName: "WhatsApp",
        exportName: EXPORT_NAMES.dashboardWidget,
      },
    ],
  },
};

export default manifest;
