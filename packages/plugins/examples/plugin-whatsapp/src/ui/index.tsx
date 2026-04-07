/**
 * @fileoverview WhatsApp plugin UI components.
 *
 * Exports match the `exportName` fields in the manifest's `ui.slots`.
 */
import type {
  PluginWidgetProps,
  PluginPageProps,
  PluginSidebarProps,
  PluginSettingsPageProps,
} from "@paperclipai/plugin-sdk/ui";
import { usePluginData } from "@paperclipai/plugin-sdk/ui";

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--color-border, #e5e5e5)",
  borderRadius: 8,
  padding: 16,
  background: "var(--color-card, #fff)",
};

const statStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  lineHeight: 1.2,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--color-muted-foreground, #888)",
  marginTop: 4,
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WhatsAppStats {
  stats: {
    totalReceived: number;
    totalSent: number;
    activeConversations: number;
    lastReceivedAt: string | null;
    lastSentAt: string | null;
  };
  connectionStatus: { connected?: boolean; checkedAt?: string; error?: string } | null;
}

interface WhatsAppConversation {
  phoneNumber: string;
  issueId: string;
  companyId: string;
  lastMessageAt: string;
  contactName?: string;
}

interface WhatsAppConversations {
  conversations: WhatsAppConversation[];
}

/* ------------------------------------------------------------------ */
/*  Dashboard Widget                                                   */
/* ------------------------------------------------------------------ */

export function WhatsAppDashboardWidget({ context }: PluginWidgetProps) {
  const { data, loading, error } = usePluginData<WhatsAppStats>("whatsapp-stats");

  if (loading) {
    return (
      <section aria-label="WhatsApp" style={cardStyle}>
        <p style={{ fontSize: 13, color: "#888" }}>Loading WhatsApp stats...</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section aria-label="WhatsApp" style={cardStyle}>
        <p style={{ fontSize: 13, color: "#c00" }}>Could not load WhatsApp data.</p>
      </section>
    );
  }

  const { stats, connectionStatus } = data;
  const isConnected = connectionStatus?.connected ?? false;

  return (
    <section aria-label="WhatsApp" style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>WhatsApp</strong>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 999,
            background: isConnected ? "#dcfce7" : "#fee2e2",
            color: isConnected ? "#166534" : "#991b1b",
            fontWeight: 600,
          }}
        >
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div>
          <div style={statStyle}>{stats.activeConversations}</div>
          <div style={labelStyle}>Active chats</div>
        </div>
        <div>
          <div style={statStyle}>{stats.totalReceived}</div>
          <div style={labelStyle}>Received</div>
        </div>
        <div>
          <div style={statStyle}>{stats.totalSent}</div>
          <div style={labelStyle}>Sent</div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar entry                                                      */
/* ------------------------------------------------------------------ */

export function WhatsAppSidebar({ context }: PluginSidebarProps) {
  const { data } = usePluginData<WhatsAppStats>("whatsapp-stats");

  const count = data?.stats?.activeConversations ?? 0;

  return (
    <a
      href={`/${context.companyPrefix ?? ""}/plugins/whatsapp`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        textDecoration: "none",
        color: "inherit",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <span style={{ flex: 1 }}>WhatsApp</span>
      {count > 0 && (
        <span
          style={{
            background: "#25D366",
            color: "#fff",
            borderRadius: 999,
            padding: "1px 7px",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      )}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Full page                                                          */
/* ------------------------------------------------------------------ */

export function WhatsAppPage({ context }: PluginPageProps) {
  const statsResult = usePluginData<WhatsAppStats>("whatsapp-stats");
  const convoResult = usePluginData<WhatsAppConversations>("whatsapp-conversations");

  const stats = statsResult.data?.stats;
  const connectionStatus = statsResult.data?.connectionStatus;
  const conversations = convoResult.data?.conversations ?? [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
        WhatsApp Integration
      </h1>
      <p style={{ fontSize: 13, color: "var(--color-muted-foreground, #888)", marginBottom: 24 }}>
        Messages are bridged to issues. Agent replies are sent back through WhatsApp.
      </p>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={statStyle}>{stats?.activeConversations ?? 0}</div>
          <div style={labelStyle}>Active Conversations</div>
        </div>
        <div style={cardStyle}>
          <div style={statStyle}>{stats?.totalReceived ?? 0}</div>
          <div style={labelStyle}>Messages Received</div>
        </div>
        <div style={cardStyle}>
          <div style={statStyle}>{stats?.totalSent ?? 0}</div>
          <div style={labelStyle}>Messages Sent</div>
        </div>
        <div style={cardStyle}>
          <div
            style={{
              ...statStyle,
              color: connectionStatus?.connected ? "#16a34a" : "#dc2626",
              fontSize: 16,
            }}
          >
            {connectionStatus?.connected ? "Connected" : "Disconnected"}
          </div>
          <div style={labelStyle}>
            {connectionStatus?.checkedAt
              ? `Checked ${new Date(connectionStatus.checkedAt).toLocaleTimeString()}`
              : "Not checked yet"}
          </div>
        </div>
      </div>

      {/* Conversations table */}
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Recent Conversations</h2>

      {conversations.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: 40,
            color: "var(--color-muted-foreground, #888)",
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 500 }}>No conversations yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>
            Messages will appear here once someone sends a WhatsApp message to your connected number.
          </p>
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, fontSize: 12, color: "var(--color-muted-foreground, #888)" }}>
                  Contact
                </th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, fontSize: 12, color: "var(--color-muted-foreground, #888)" }}>
                  Phone
                </th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, fontSize: 12, color: "var(--color-muted-foreground, #888)" }}>
                  Linked Issue
                </th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, fontSize: 12, color: "var(--color-muted-foreground, #888)" }}>
                  Last Message
                </th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((c: WhatsAppConversation) => (
                <tr
                  key={c.phoneNumber}
                  style={{ borderBottom: "1px solid var(--color-border, #e5e5e5)" }}
                >
                  <td style={{ padding: "10px 16px", fontWeight: 500 }}>
                    {c.contactName ?? "Unknown"}
                  </td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12 }}>
                    {c.phoneNumber}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <a
                      href={`/${context.companyPrefix ?? ""}/issues/${c.issueId}`}
                      style={{ color: "var(--color-primary, #2563eb)", textDecoration: "none" }}
                    >
                      {c.issueId.slice(0, 8)}...
                    </a>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--color-muted-foreground, #888)" }}>
                    {new Date(c.lastMessageAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings page (custom config UI override)                          */
/* ------------------------------------------------------------------ */

export function WhatsAppSettingsPage({ context }: PluginSettingsPageProps) {
  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>WhatsApp Setup Guide</h2>
      <ol style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20, color: "var(--color-muted-foreground, #888)" }}>
        <li>Create a Meta App at developers.facebook.com and enable the WhatsApp product.</li>
        <li>Generate a permanent access token and store it in the Paperclip Secrets manager.</li>
        <li>Copy your Phone Number ID and Business Account ID from the Meta dashboard.</li>
        <li>
          Set the webhook URL in your Meta App to:
          <code style={{ display: "block", background: "var(--color-muted, #f5f5f5)", padding: "6px 10px", borderRadius: 4, marginTop: 4, fontSize: 12, wordBreak: "break-all" }}>
            {`<your-paperclip-url>/api/plugins/<plugin-id>/webhooks/whatsapp-inbound`}
          </code>
        </li>
        <li>Enter the same Verify Token you set in Meta into the plugin config below.</li>
        <li>Choose a default company and project for incoming conversations.</li>
        <li>Optionally select an agent to auto-assign new WhatsApp conversations to.</li>
      </ol>
      <p style={{ fontSize: 12, marginTop: 16, color: "var(--color-muted-foreground, #888)" }}>
        Use the auto-generated JSON Schema form below to fill in the configuration values, then save.
      </p>
    </div>
  );
}
