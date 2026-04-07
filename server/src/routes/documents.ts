import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { documents, issueDocuments, issues, agents } from "@paperclipai/db";
import { desc, eq, asc } from "drizzle-orm";
import { assertCompanyAccess } from "./authz.js";

export function documentRoutes(db: Db) {
  const router = Router();

  router.get("/companies/:companyId/documents", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const rows = await db
      .select({
        id: documents.id,
        companyId: documents.companyId,
        title: documents.title,
        format: documents.format,
        latestRevisionNumber: documents.latestRevisionNumber,
        createdByAgentId: documents.createdByAgentId,
        createdByUserId: documents.createdByUserId,
        updatedByAgentId: documents.updatedByAgentId,
        updatedByUserId: documents.updatedByUserId,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        // join fields
        issueId: issueDocuments.issueId,
        key: issueDocuments.key,
        issueTitle: issues.title,
        issueIdentifier: issues.identifier,
        agentName: agents.name,
      })
      .from(documents)
      .leftJoin(issueDocuments, eq(issueDocuments.documentId, documents.id))
      .leftJoin(issues, eq(issues.id, issueDocuments.issueId))
      .leftJoin(agents, eq(agents.id, documents.createdByAgentId))
      .where(eq(documents.companyId, companyId))
      .orderBy(desc(documents.updatedAt));

    res.json(rows);
  });

  router.get("/companies/:companyId/documents/:documentId", async (req, res) => {
    const companyId = req.params.companyId as string;
    const documentId = req.params.documentId as string;
    assertCompanyAccess(req, companyId);

    const row = await db
      .select({
        id: documents.id,
        companyId: documents.companyId,
        title: documents.title,
        format: documents.format,
        latestBody: documents.latestBody,
        latestRevisionNumber: documents.latestRevisionNumber,
        createdByAgentId: documents.createdByAgentId,
        createdByUserId: documents.createdByUserId,
        updatedByAgentId: documents.updatedByAgentId,
        updatedByUserId: documents.updatedByUserId,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        issueId: issueDocuments.issueId,
        key: issueDocuments.key,
        issueTitle: issues.title,
        issueIdentifier: issues.identifier,
      })
      .from(documents)
      .leftJoin(issueDocuments, eq(issueDocuments.documentId, documents.id))
      .leftJoin(issues, eq(issues.id, issueDocuments.issueId))
      .where(eq(documents.id, documentId))
      .then((rows) => rows[0] ?? null);

    if (!row || row.companyId !== companyId) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.json(row);
  });

  return router;
}
