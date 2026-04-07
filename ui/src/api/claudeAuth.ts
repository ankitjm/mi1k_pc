import { api } from "./client";

export interface ClaudeAuthStatus {
  status: "ok" | "expiring_soon" | "expired" | "not_logged_in";
  message: string;
  expiresAt?: string;
  expiresInHours?: number;
  hasRefreshToken?: boolean;
  expiredAt?: string;
}

export interface ClaudeAuthRefreshResult {
  status?: string;
  error?: string;
  message: string;
  expiresAt?: string;
}

export interface ClaudeAuthLoginResult {
  status: "login_started" | "login_in_progress";
  url: string;
  message: string;
}

export interface ClaudeAuthSubmitCodeResult {
  status?: string;
  error?: string;
  message: string;
}

export const claudeAuthApi = {
  getStatus: () => api.get<ClaudeAuthStatus>("/instance/claude-auth/status"),
  refresh: () => api.post<ClaudeAuthRefreshResult>("/instance/claude-auth/refresh", {}),
  login: () => api.post<ClaudeAuthLoginResult>("/instance/claude-auth/login", {}),
  submitCode: (code: string) =>
    api.post<ClaudeAuthSubmitCodeResult>("/instance/claude-auth/submit-code", { code }),
};
