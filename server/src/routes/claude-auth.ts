import { Router, type Request } from "express";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import { forbidden } from "../errors.js";

const CREDENTIALS_PATH = process.env.PAPERCLIP_CLAUDE_CREDENTIALS_PATH
  ?? `${process.env.HOME ?? "/paperclip"}/.claude/.credentials.json`;

const OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const OAUTH_SCOPES = [
  "user:inference",
  "user:profile",
  "user:sessions:claude_code",
];

/** Only instance admins (or local-trusted mode) may touch Claude auth. */
function assertInstanceAdmin(req: Request) {
  if (req.actor.type !== "board") throw forbidden("Board access required");
  if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) return;
  throw forbidden("Instance admin access required");
}

// ── helpers ──────────────────────────────────────────────────────────────────

interface OAuthCredentials {
  claudeAiOauth?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    scopes?: string[];
  };
}

function readCredentials(): OAuthCredentials | null {
  try {
    return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  } catch {
    return null;
  }
}

function refreshTokenViaOAuth(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: OAUTH_CLIENT_ID,
      scope: OAUTH_SCOPES.join(" "),
    });
    const req = https.request(
      {
        hostname: "platform.claude.com",
        path: "/v1/oauth/token",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": data.length },
        timeout: 15_000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => (body += chunk.toString()));
        res.on("end", () => {
          if (res.statusCode === 200) {
            const resp = JSON.parse(body);
            resolve({
              accessToken: resp.access_token,
              refreshToken: resp.refresh_token || refreshToken,
              expiresAt: Date.now() + resp.expires_in * 1000,
            });
          } else {
            reject(new Error(`Refresh failed (${res.statusCode}): ${body}`));
          }
        });
      },
    );
    req.on("error", (e) => reject(e));
    req.write(data);
    req.end();
  });
}

// ── In-flight login state ────────────────────────────────────────────────────

interface ActiveLogin {
  child: ChildProcess;
  url: string;
  startedAt: number;
  completed: boolean;
  error: string | null;
}

let activeLogin: ActiveLogin | null = null;

function cleanupLogin() {
  if (activeLogin) {
    try { activeLogin.child.kill(); } catch {}
    activeLogin = null;
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

export function claudeAuthRoutes() {
  const router = Router();

  /**
   * GET /instance/claude-auth/status
   * Returns current Claude auth status without running a full probe.
   */
  router.get("/instance/claude-auth/status", (req, res) => {
    assertInstanceAdmin(req);
    const creds = readCredentials();
    const oauth = creds?.claudeAiOauth;

    if (!oauth || !oauth.accessToken) {
      res.json({ status: "not_logged_in", message: "Claude is not logged in." });
      return;
    }

    const now = Date.now();
    const expiresAt = oauth.expiresAt ?? 0;
    const hasRefreshToken = !!oauth.refreshToken;
    const expiresInMs = expiresAt - now;

    if (expiresInMs <= 0) {
      res.json({
        status: "expired",
        message: "Claude session has expired.",
        hasRefreshToken,
        expiredAt: new Date(expiresAt).toISOString(),
      });
      return;
    }

    const expiresInHours = Math.round(expiresInMs / (1000 * 60 * 60) * 10) / 10;
    const warnThresholdMs = 6 * 60 * 60 * 1000; // 6 hours

    res.json({
      status: expiresInMs < warnThresholdMs ? "expiring_soon" : "ok",
      message:
        expiresInMs < warnThresholdMs
          ? `Claude session expires in ${expiresInHours} hours.`
          : "Claude is authenticated and session is valid.",
      expiresAt: new Date(expiresAt).toISOString(),
      expiresInHours,
      hasRefreshToken,
    });
  });

  /**
   * POST /instance/claude-auth/refresh
   * Attempts to refresh the OAuth token using the stored refresh token.
   */
  router.post("/instance/claude-auth/refresh", async (req, res) => {
    assertInstanceAdmin(req);
    const creds = readCredentials();
    const oauth = creds?.claudeAiOauth;

    if (!oauth?.refreshToken) {
      res.status(400).json({
        error: "no_refresh_token",
        message: "No refresh token available. A full re-login is required.",
      });
      return;
    }

    try {
      const result = await refreshTokenViaOAuth(oauth.refreshToken);
      const updatedCreds = { ...creds, claudeAiOauth: { ...oauth, ...result } };
      fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(updatedCreds));
      res.json({
        status: "refreshed",
        message: "Token refreshed successfully.",
        expiresAt: new Date(result.expiresAt).toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({
        error: "refresh_failed",
        message: `Token refresh failed: ${message}. A full re-login is required.`,
      });
    }
  });

  /**
   * POST /instance/claude-auth/login
   * Starts a new Claude OAuth login flow. Returns the URL the user must visit.
   * The CLI process stays alive waiting for the auth code on stdin.
   */
  router.post("/instance/claude-auth/login", (req, res) => {
    assertInstanceAdmin(req);

    // If there's an active login that's still alive (< 5 min), return its URL
    if (activeLogin && !activeLogin.completed && Date.now() - activeLogin.startedAt < 5 * 60 * 1000) {
      res.json({
        status: "login_in_progress",
        url: activeLogin.url,
        message: "A login flow is already active. Open the URL, authorize, then paste the code below.",
      });
      return;
    }

    // Kill any stale process
    cleanupLogin();

    const child = spawn("claude", ["auth", "login", "--claudeai"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, BROWSER: "echo" },
    });

    let stdout = "";
    let stderr = "";
    let urlSent = false;

    const timeout = setTimeout(() => {
      if (!urlSent) {
        child.kill();
        activeLogin = null;
        res.status(504).json({
          error: "timeout",
          message: "Timed out waiting for login URL from Claude CLI.",
        });
      }
    }, 15_000);

    function handleOutput(chunk: string) {
      const combined = stdout + stderr;
      const urlMatch = combined.match(/(https:\/\/claude\.ai\/oauth\/authorize\S+)/);
      if (urlMatch && !urlSent) {
        urlSent = true;
        clearTimeout(timeout);
        const url = urlMatch[1];
        activeLogin = { child, url, startedAt: Date.now(), completed: false, error: null };
        res.json({
          status: "login_started",
          url,
          message: "Open this URL in your browser to sign in. After authorizing, paste the code you receive.",
        });
      }
    }

    child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); handleOutput(data.toString()); });
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); handleOutput(data.toString()); });

    child.on("close", (code) => {
      if (activeLogin && activeLogin.child === child) {
        activeLogin.completed = true;
        if (code !== 0) {
          activeLogin.error = `Process exited with code ${code}`;
        }
        // Auto-cleanup after 30s
        setTimeout(() => { if (activeLogin?.child === child) activeLogin = null; }, 30_000);
      }
      if (!urlSent) {
        clearTimeout(timeout);
        res.status(500).json({
          error: "login_failed",
          message: `Claude auth login exited (code ${code}) without producing a URL. stderr: ${stderr.slice(0, 500)}`,
        });
      }
    });
  });

  /**
   * POST /instance/claude-auth/submit-code
   * Feeds the authorization code from the OAuth callback page into the
   * waiting `claude auth login` process's stdin.
   */
  router.post("/instance/claude-auth/submit-code", (req, res) => {
    assertInstanceAdmin(req);

    const rawCode = (req.body as { code?: string }).code;
    if (!rawCode || typeof rawCode !== "string" || rawCode.trim().length === 0) {
      res.status(400).json({ error: "missing_code", message: "Authorization code is required." });
      return;
    }
    // Strip URL fragment (#state) if the user pasted the full callback URL or code+fragment
    const code = rawCode.trim().split("#")[0].trim();

    if (!activeLogin || activeLogin.completed) {
      res.status(409).json({
        error: "no_active_login",
        message: "No active login flow. Please click 'Reconnect Claude' first to start a new login.",
      });
      return;
    }

    try {
      // Write the code to the CLI's stdin — it's waiting for this
      activeLogin.child.stdin!.write(code.trim() + "\n");

      // Wait a few seconds for the process to exchange the code for tokens
      const checkChild = activeLogin.child;
      let responded = false;

      const finish = (success: boolean, message: string) => {
        if (responded) return;
        responded = true;
        if (success) {
          res.json({ status: "authenticated", message });
        } else {
          res.status(502).json({ error: "code_exchange_failed", message });
        }
      };

      checkChild.on("close", (exitCode) => {
        if (exitCode === 0) {
          finish(true, "Claude authenticated successfully!");
        } else {
          finish(false, `Authentication failed (exit code ${exitCode}). The code may be invalid or expired — try again.`);
        }
      });

      // Timeout if the process doesn't finish within 15s
      setTimeout(() => {
        finish(false, "Code submission timed out. The code may be invalid — try starting a new login.");
      }, 15_000);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "submit_failed", message: `Failed to submit code: ${message}` });
    }
  });

  return router;
}
