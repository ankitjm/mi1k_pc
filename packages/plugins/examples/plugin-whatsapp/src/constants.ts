/* ------------------------------------------------------------------ */
/*  WhatsApp Plugin Constants                                          */
/* ------------------------------------------------------------------ */

export const PLUGIN_ID = "paperclip.whatsapp";
export const PLUGIN_VERSION = "0.1.0";

/* Webhook endpoint keys */
export const WEBHOOK_KEYS = {
  /** Receives inbound messages from the WhatsApp Business API webhook */
  inbound: "whatsapp-inbound",
  /** Receives delivery status updates from WhatsApp */
  status: "whatsapp-status",
} as const;

/* Job keys */
export const JOB_KEYS = {
  /** Periodic health check of the WhatsApp connection */
  healthCheck: "whatsapp-health-check",
} as const;

/* Tool names (available to agents) */
export const TOOL_NAMES = {
  /** Send a WhatsApp message to a phone number */
  sendMessage: "whatsapp-send-message",
  /** List active WhatsApp conversations */
  listConversations: "whatsapp-list-conversations",
} as const;

/* UI slot IDs */
export const SLOT_IDS = {
  page: "whatsapp-page",
  settingsPage: "whatsapp-settings",
  sidebar: "whatsapp-sidebar",
  dashboardWidget: "whatsapp-dashboard-widget",
} as const;

/* UI export names (must match the function names in ui/index.tsx) */
export const EXPORT_NAMES = {
  page: "WhatsAppPage",
  settingsPage: "WhatsAppSettingsPage",
  sidebar: "WhatsAppSidebar",
  dashboardWidget: "WhatsAppDashboardWidget",
} as const;

/* Route path for the plugin page */
export const PAGE_ROUTE = "/plugins/whatsapp";

/* State keys */
export const STATE_KEYS = {
  /** Maps phone numbers to issue IDs: { [phone]: issueId } */
  phoneToIssue: "phone-to-issue-map",
  /** Connection status and metadata */
  connectionStatus: "connection-status",
  /** Message statistics */
  messageStats: "message-stats",
} as const;

/* Default plugin configuration */
export const DEFAULT_CONFIG = {
  /** WhatsApp Business API phone number ID */
  phoneNumberId: "",
  /** WhatsApp Business Account ID */
  businessAccountId: "",
  /** API access token reference (stored as a secret) */
  accessTokenRef: "",
  /** Webhook verify token for Meta webhook validation */
  webhookVerifyToken: "",
  /** Default company ID to route messages to */
  defaultCompanyId: "",
  /** Default project ID to create issues in */
  defaultProjectId: "",
  /** Whether to auto-create issues for new phone numbers */
  autoCreateIssues: true,
  /** Whether to auto-assign an agent to new conversations */
  autoAssignAgent: true,
  /** Default agent ID to assign WhatsApp conversations to */
  defaultAgentId: "",
  /** Message template for first-time contacts */
  welcomeMessage: "Hello! Your message has been received. An agent will respond shortly.",
} as const;
