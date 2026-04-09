/**
 * Wiki / Brand Brain Routes
 *
 * GET  /wiki/entries  — returns all brand brain + wiki entries
 * POST /wiki/upload   — upload a file to the brand brain (context/ folder)
 * DELETE /wiki/entry   — remove an entry from context/
 */
import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { extractFileContent } from "../services/knowledge-base.js";

interface WikiEntry {
  filePath: string;
  agent: string;
  date: string;
  type: string;
  tags: string[];
  source?: string;
  title: string;
  body: string;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const meta: Record<string, string> = {};
  if (!raw.startsWith("---")) return { meta, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta, body: raw };
  for (const line of raw.slice(3, end).split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: raw.slice(end + 4).trim() };
}

function readWikiDir(dir: string, entries: WikiEntry[]): void {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) { readWikiDir(full, entries); continue; }
    if (!item.isFile() || !item.name.endsWith(".md")) continue;
    try {
      const raw = fs.readFileSync(full, "utf8");
      const { meta, body } = parseFrontmatter(raw);
      const rawTags = meta.tags ?? "";
      const tagStr = rawTags.replace(/^\[|\]$/g, "");
      const tags = tagStr ? tagStr.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
      entries.push({
        filePath: full,
        agent: meta.agent ?? "",
        date: (meta.date ?? "").slice(0, 10),
        type: meta.type ?? "unknown",
        tags,
        source: meta.source,
        title: meta.title ?? body.match(/^#\s+(.+)$/m)?.[1] ?? item.name.replace(".md", ""),
        body,
      });
    } catch { /* skip */ }
  }
}

function getDataRoot(): string {
  return process.env.PAPERCLIP_HOME || path.resolve(process.cwd(), "paperclip-data");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 5 },
});

export function wikiRoutes() {
  const router = Router();

  // ── list all entries ─────────────────────────────────────────────────────
  router.get("/wiki/entries", (_req, res) => {
    const dataRoot = getDataRoot();
    const wikiDir = path.join(dataRoot, "wiki");
    const contextDir = path.join(dataRoot, "context");
    const entries: WikiEntry[] = [];

    // wiki entries (session extracts, memory, domain)
    readWikiDir(wikiDir, entries);

    // core brand context files
    if (fs.existsSync(contextDir)) {
      for (const item of fs.readdirSync(contextDir, { withFileTypes: true })) {
        if (!item.isFile() || !item.name.endsWith(".md")) continue;
        try {
          const full = path.join(contextDir, item.name);
          const raw = fs.readFileSync(full, "utf8");
          const title = raw.match(/^#\s+(.+)$/m)?.[1]
            ?? item.name.replace(/^\d+_/, "").replace(/_/g, " ").replace(".md", "");
          entries.push({
            filePath: full,
            agent: "brand",
            date: "",
            type: "core_brand",
            tags: ["brand", "core"],
            source: `context/${item.name}`,
            title,
            body: raw,
          });
        } catch { /* skip */ }
      }
    }

    entries.sort((a, b) => {
      const order = (t: string) => t === "core_brand" ? 0 : 1;
      const diff = order(a.type) - order(b.type);
      return diff !== 0 ? diff : b.date.localeCompare(a.date);
    });

    res.json({ entries });
  });

  // ── upload file to brand brain ───────────────────────────────────────────
  router.post("/wiki/upload", upload.array("files", 5), async (req, res) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) { res.status(400).json({ error: "No files provided" }); return; }

    const contextDir = path.join(getDataRoot(), "context");
    fs.mkdirSync(contextDir, { recursive: true });

    const results: Array<{ name: string; path: string; chars: number }> = [];
    const errors: Array<{ name: string; error: string }> = [];

    for (const file of files) {
      try {
        const extracted = await extractFileContent({
          originalname: file.originalname,
          buffer: file.buffer,
          mimetype: file.mimetype,
        });

        // Build a slug from the filename
        const baseName = file.originalname
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-zA-Z0-9]+/g, "_")
          .toLowerCase()
          .slice(0, 60);
        const outName = `${baseName}.md`;
        const outPath = path.join(contextDir, outName);

        // Write as markdown (with title from filename)
        const title = file.originalname.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
        const content = `# ${title}\n\n${extracted.text}`;
        fs.writeFileSync(outPath, content, "utf8");

        results.push({ name: file.originalname, path: outPath, chars: extracted.text.length });
      } catch (err) {
        errors.push({ name: file.originalname, error: (err as Error).message });
      }
    }

    res.json({ uploaded: results, errors });
  });

  // ── delete entry from context/ ───────────────────────────────────────────
  router.delete("/wiki/entry", (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) { res.status(400).json({ error: "path required" }); return; }

    const contextDir = path.join(getDataRoot(), "context");
    // Only allow deleting from context/ — not wiki/ or agent files
    if (!filePath.startsWith(contextDir)) {
      res.status(403).json({ error: "Can only delete brand brain files" });
      return;
    }
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    fs.unlinkSync(filePath);
    res.json({ deleted: filePath });
  });

  return router;
}
