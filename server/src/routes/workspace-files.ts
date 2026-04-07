import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import type { Db } from "@paperclipai/db";
import { agents } from "@paperclipai/db";
import { eq } from "drizzle-orm";
import { assertCompanyAccess } from "./authz.js";

/**
 * File extensions we consider "generated documents" worth surfacing.
 * Excludes code, configs, and internal metadata.
 */
const DOCUMENT_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".tsv",
  ".pptx", ".ppt", ".odt", ".ods", ".odp",
  ".txt", ".md", ".json", ".html", ".htm",
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
]);

/**
 * Directories to skip when scanning workspaces.
 */
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".cache", "__pycache__", ".venv",
  "dist", "build", ".claude", ".next",
]);

/** Files to skip. */
const SKIP_FILES = new Set([
  "MEMORY.md", "CLAUDE.md", "index.md", "summary.md",
]);

/** Paths containing these segments are skipped (agent internal dirs). */
const SKIP_PATH_SEGMENTS = ["memory", "life", ".claude"];

const WORKSPACES_ROOT = "/paperclip/instances/default/workspaces";

interface WorkspaceFile {
  id: string; // deterministic id: agentId + relative path hash
  agentId: string;
  agentName: string;
  companyId: string;
  filename: string;
  relativePath: string;
  contentType: string;
  byteSize: number;
  createdAt: string;
  modifiedAt: string;
  contentPath: string;
}

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".csv": "text/csv",
    ".tsv": "text/tab-separated-values",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".ppt": "application/vnd.ms-powerpoint",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".html": "text/html",
    ".htm": "text/html",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

function scanWorkspaceDir(dir: string, root: string): { relativePath: string; stat: fs.Stats }[] {
  const results: { relativePath: string; stat: fs.Stats }[] = [];

  function walk(current: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(path.join(current, entry.name));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!DOCUMENT_EXTENSIONS.has(ext)) continue;
        if (SKIP_FILES.has(entry.name)) continue;

        const fullPath = path.join(current, entry.name);
        const relativePath = path.relative(root, fullPath);

        // Skip internal agent directories
        const parts = relativePath.split(path.sep);
        if (parts.some((p) => SKIP_PATH_SEGMENTS.includes(p))) continue;

        try {
          const stat = fs.statSync(fullPath);
          results.push({ relativePath, stat });
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  walk(dir);
  return results;
}

/** Simple deterministic ID from agentId + path */
function fileId(agentId: string, relativePath: string): string {
  // Use a simple hash approach — base64url of agent+path
  const raw = `${agentId}:${relativePath}`;
  return Buffer.from(raw).toString("base64url");
}

export function workspaceFileRoutes(db: Db) {
  const router = Router();

  /**
   * GET /companies/:companyId/workspace-files
   * Scans all agent workspaces for generated documents/files.
   */
  router.get("/companies/:companyId/workspace-files", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    // Get all agents for this company
    const agentRows = await db
      .select({ id: agents.id, name: agents.name, companyId: agents.companyId })
      .from(agents)
      .where(eq(agents.companyId, companyId));

    const files: WorkspaceFile[] = [];

    for (const agent of agentRows) {
      const wsDir = path.join(WORKSPACES_ROOT, agent.id);
      if (!fs.existsSync(wsDir)) continue;

      const scanned = scanWorkspaceDir(wsDir, wsDir);
      for (const { relativePath, stat } of scanned) {
        const ext = path.extname(relativePath).toLowerCase();
        const id = fileId(agent.id, relativePath);
        files.push({
          id,
          agentId: agent.id,
          agentName: agent.name,
          companyId,
          filename: path.basename(relativePath),
          relativePath,
          contentType: mimeFromExt(ext),
          byteSize: stat.size,
          createdAt: stat.birthtime.toISOString(),
          modifiedAt: stat.mtime.toISOString(),
          contentPath: `/api/workspace-files/${encodeURIComponent(id)}/content`,
        });
      }
    }

    // Sort by modified time, newest first
    files.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    res.json(files);
  });

  /**
   * GET /workspace-files/:fileId/content
   * Serves the actual file content.
   */
  router.get("/workspace-files/:fileId/content", async (req, res) => {
    const fileIdParam = req.params.fileId as string;

    // Decode the ID to get agentId + relativePath
    let decoded: string;
    try {
      decoded = Buffer.from(fileIdParam, "base64url").toString("utf8");
    } catch {
      res.status(400).json({ error: "Invalid file ID" });
      return;
    }

    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) {
      res.status(400).json({ error: "Invalid file ID format" });
      return;
    }

    const agentId = decoded.slice(0, colonIdx);
    const relativePath = decoded.slice(colonIdx + 1);

    // Validate agent exists and get company for access check
    const [agent] = await db
      .select({ id: agents.id, companyId: agents.companyId })
      .from(agents)
      .where(eq(agents.id, agentId));

    if (!agent) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    assertCompanyAccess(req, agent.companyId);

    // Resolve and validate the path is within the workspace
    const wsDir = path.join(WORKSPACES_ROOT, agentId);
    const fullPath = path.resolve(wsDir, relativePath);

    if (!fullPath.startsWith(wsDir + path.sep) && fullPath !== wsDir) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const stat = fs.statSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = mimeFromExt(ext);
    const filename = path.basename(fullPath);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(stat.size));
    res.setHeader("Cache-Control", "private, max-age=60");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `inline; filename="${filename.replaceAll("\"", "")}"`);

    fs.createReadStream(fullPath).pipe(res);
  });

  return router;
}
