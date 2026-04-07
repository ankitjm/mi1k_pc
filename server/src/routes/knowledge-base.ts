/**
 * Knowledge Base Routes
 *
 * Handles file uploads and link processing for company onboarding.
 * Produces a COMPANY_CONTEXT.md that agents use as their foundation.
 */
import { Router } from "express";
import multer from "multer";
import type { Db } from "@paperclipai/db";
import { buildKnowledgeBase, extractFileContent, fetchUrlContent } from "../services/knowledge-base.js";
import { assertCompanyAccess } from "./authz.js";

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain",
  "text/markdown",
  "application/json",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file
const MAX_FILES = 10;

export function knowledgeBaseRoutes(db: Db) {
  const router = Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
    fileFilter: (_req, file, cb) => {
      // Accept common document types
      const ext = file.originalname.toLowerCase();
      if (
        ALLOWED_MIMES.has(file.mimetype) ||
        ext.endsWith(".pdf") || ext.endsWith(".docx") || ext.endsWith(".xlsx") ||
        ext.endsWith(".xls") || ext.endsWith(".csv") || ext.endsWith(".txt") ||
        ext.endsWith(".md") || ext.endsWith(".json")
      ) {
        cb(null, true);
      } else {
        cb(new Error(`File type not supported: ${file.mimetype} (${file.originalname})`));
      }
    },
  });

  // Process uploaded files + links and build company context
  router.post("/:companyId/knowledge-base/build", (req, res, next) => {
    upload.array("files", MAX_FILES)(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          res.status(400).json({ error: err.message });
          return;
        }
        if (err instanceof Error) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.status(500).json({ error: "File upload failed" });
        return;
      }
      next();
    });
  }, async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const files = (req.files as Express.Multer.File[]) ?? [];
    const { companyName, mission, industry, additionalContext, links } = req.body as {
      companyName?: string;
      mission?: string;
      industry?: string;
      additionalContext?: string;
      links?: string; // JSON array or comma-separated
    };

    // Parse links
    let linkList: string[] = [];
    if (links) {
      try {
        linkList = JSON.parse(links);
      } catch {
        linkList = links.split(/[,\n]/).map((l: string) => l.trim()).filter(Boolean);
      }
    }

    try {
      const result = await buildKnowledgeBase({
        companyName: companyName ?? "Unnamed Company",
        mission: mission ?? undefined,
        industry: industry ?? undefined,
        additionalContext: additionalContext ?? undefined,
        files: files.map((f) => ({
          originalname: f.originalname,
          buffer: f.buffer,
          mimetype: f.mimetype,
        })),
        links: linkList,
      });

      res.json({
        contextMarkdown: result.contextMarkdown,
        sources: result.extractedSources,
        errors: result.errors,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Knowledge base build failed",
      });
    }
  });

  // Quick extract a single file (for preview)
  router.post("/:companyId/knowledge-base/extract-file", (req, res, next) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Upload failed" });
        return;
      }
      next();
    });
  }, async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    try {
      const content = await extractFileContent({
        originalname: req.file.originalname,
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
      });
      res.json({ source: content.source, type: content.type, charCount: content.text.length, preview: content.text.slice(0, 500) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Extraction failed" });
    }
  });

  // Fetch and extract a URL (for preview)
  router.post("/:companyId/knowledge-base/fetch-url", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const { url } = req.body as { url?: string };
    if (!url) {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    try {
      const content = await fetchUrlContent(url);
      res.json({
        source: content.source,
        type: content.type,
        charCount: content.text.length,
        preview: content.text.slice(0, 500),
        metadata: content.metadata,
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Fetch failed" });
    }
  });

  return router;
}
