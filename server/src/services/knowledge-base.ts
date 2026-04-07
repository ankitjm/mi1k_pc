/**
 * Knowledge Base Service
 *
 * Extracts text from uploaded files (PDF, DOCX, XLSX/CSV) and fetched URLs,
 * then builds a structured COMPANY_CONTEXT.md for agent consumption.
 */
import * as pdfParse from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import * as cheerio from "cheerio";
import { logger } from "../middleware/logger.js";

export interface ExtractedContent {
  source: string; // filename or URL
  type: "pdf" | "docx" | "xlsx" | "csv" | "text" | "url";
  text: string;
  metadata?: Record<string, string>;
}

export interface KnowledgeBaseInput {
  companyName: string;
  mission?: string;
  industry?: string;
  additionalContext?: string;
  files: Array<{ originalname: string; buffer: Buffer; mimetype: string }>;
  links: string[];
}

export interface KnowledgeBaseResult {
  contextMarkdown: string;
  extractedSources: Array<{ source: string; type: string; charCount: number }>;
  errors: Array<{ source: string; error: string }>;
}

// ---- File extraction ----

async function extractPdf(buffer: Buffer): Promise<string> {
  const pdf = (pdfParse as any).default ?? pdfParse;
  const data = await pdf(buffer);
  return data.text?.trim() ?? "";
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() ?? "";
}

function extractXlsx(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) {
      parts.push(`## Sheet: ${sheetName}\n\n${csv}`);
    }
  }
  return parts.join("\n\n");
}

function extractCsv(buffer: Buffer): string {
  return buffer.toString("utf-8").trim();
}

function extractText(buffer: Buffer): string {
  return buffer.toString("utf-8").trim();
}

export async function extractFileContent(
  file: { originalname: string; buffer: Buffer; mimetype: string },
): Promise<ExtractedContent> {
  const name = file.originalname.toLowerCase();
  const mime = file.mimetype;

  try {
    if (mime === "application/pdf" || name.endsWith(".pdf")) {
      return { source: file.originalname, type: "pdf", text: await extractPdf(file.buffer) };
    }
    if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      return { source: file.originalname, type: "docx", text: await extractDocx(file.buffer) };
    }
    if (
      mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mime === "application/vnd.ms-excel" ||
      name.endsWith(".xlsx") || name.endsWith(".xls")
    ) {
      return { source: file.originalname, type: "xlsx", text: extractXlsx(file.buffer) };
    }
    if (mime === "text/csv" || name.endsWith(".csv")) {
      return { source: file.originalname, type: "csv", text: extractCsv(file.buffer) };
    }
    // Fallback: try as text
    return { source: file.originalname, type: "text", text: extractText(file.buffer) };
  } catch (err) {
    logger.warn({ err, filename: file.originalname }, "Failed to extract file content");
    throw new Error(`Failed to extract content from ${file.originalname}: ${err instanceof Error ? err.message : "unknown error"}`);
  }
}

// ---- URL fetching ----

export async function fetchUrlContent(url: string): Promise<ExtractedContent> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mi1kBot/1.0 (knowledge-base-builder)" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();

    if (contentType.includes("text/html")) {
      const $ = cheerio.load(body);

      // Remove scripts, styles, nav, footer
      $("script, style, nav, footer, header, iframe, noscript").remove();

      // Extract metadata
      const metadata: Record<string, string> = {};
      const title = $("title").text().trim();
      if (title) metadata.title = title;
      const description = $('meta[name="description"]').attr("content")?.trim();
      if (description) metadata.description = description;

      // Extract brand colors from CSS
      const colors: string[] = [];
      $("*[style]").each((_, el) => {
        const style = $(el).attr("style") ?? "";
        const colorMatches = style.match(/#[0-9a-fA-F]{3,6}/g);
        if (colorMatches) colors.push(...colorMatches);
      });
      // Also check inline/embedded CSS
      $("style").each((_, el) => {
        const css = $(el).text();
        const colorMatches = css.match(/#[0-9a-fA-F]{3,6}/g);
        if (colorMatches) colors.push(...colorMatches);
      });
      if (colors.length > 0) {
        const unique = [...new Set(colors)].slice(0, 20);
        metadata.brandColors = unique.join(", ");
      }

      // Get main content
      const mainContent =
        $("main").text().trim() ||
        $("article").text().trim() ||
        $("body").text().trim();

      // Clean up whitespace
      const cleaned = mainContent.replace(/\s+/g, " ").trim();
      const truncated = cleaned.slice(0, 50000); // Cap at 50k chars

      return { source: url, type: "url", text: truncated, metadata };
    }

    // Non-HTML: treat as text
    return { source: url, type: "url", text: body.slice(0, 50000) };
  } catch (err) {
    throw new Error(`Failed to fetch ${url}: ${err instanceof Error ? err.message : "unknown"}`);
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Context builder ----

export async function buildKnowledgeBase(input: KnowledgeBaseInput): Promise<KnowledgeBaseResult> {
  const extracted: ExtractedContent[] = [];
  const errors: Array<{ source: string; error: string }> = [];

  // Extract files
  for (const file of input.files) {
    try {
      const content = await extractFileContent(file);
      if (content.text.length > 0) {
        extracted.push(content);
      }
    } catch (err) {
      errors.push({ source: file.originalname, error: err instanceof Error ? err.message : "extraction failed" });
    }
  }

  // Fetch links
  for (const url of input.links) {
    if (!url.trim()) continue;
    try {
      const content = await fetchUrlContent(url.trim());
      if (content.text.length > 0) {
        extracted.push(content);
      }
    } catch (err) {
      errors.push({ source: url, error: err instanceof Error ? err.message : "fetch failed" });
    }
  }

  // Build the context markdown
  const sections: string[] = [];

  // Header
  sections.push(`# Company Context: ${input.companyName}`);
  sections.push(`> Auto-generated knowledge base for AI agents. Updated at onboarding.`);
  sections.push("");

  // Company overview
  sections.push("## Company Overview");
  sections.push(`**Name:** ${input.companyName}`);
  if (input.mission) sections.push(`**Mission:** ${input.mission}`);
  if (input.industry) sections.push(`**Industry:** ${input.industry}`);
  sections.push("");

  if (input.additionalContext?.trim()) {
    sections.push("## Additional Context");
    sections.push(input.additionalContext.trim());
    sections.push("");
  }

  // Brand info from URLs
  const urlSources = extracted.filter((e) => e.type === "url" && e.metadata);
  if (urlSources.length > 0) {
    sections.push("## Brand & Web Presence");
    for (const src of urlSources) {
      sections.push(`### ${src.metadata?.title ?? src.source}`);
      if (src.metadata?.description) sections.push(`*${src.metadata.description}*`);
      if (src.metadata?.brandColors) sections.push(`**Brand colors detected:** ${src.metadata.brandColors}`);
      // Include a summary (first 2000 chars of content)
      const summary = src.text.slice(0, 2000);
      if (summary) sections.push(`\n${summary}${src.text.length > 2000 ? "\n\n*(content truncated)*" : ""}`);
      sections.push("");
    }
  }

  // Document knowledge
  const fileSources = extracted.filter((e) => e.type !== "url");
  if (fileSources.length > 0) {
    sections.push("## Knowledge Base Documents");
    for (const src of fileSources) {
      sections.push(`### ${src.source} (${src.type.toUpperCase()})`);
      // Include content (cap each doc at 10000 chars to keep context manageable)
      const content = src.text.slice(0, 10000);
      sections.push(content);
      if (src.text.length > 10000) sections.push("\n*(document truncated — full content available in uploaded files)*");
      sections.push("");
    }
  }

  const contextMarkdown = sections.join("\n");

  return {
    contextMarkdown,
    extractedSources: extracted.map((e) => ({
      source: e.source,
      type: e.type,
      charCount: e.text.length,
    })),
    errors,
  };
}
