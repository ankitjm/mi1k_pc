import { api } from "./client";

export interface CompanyDocument {
  id: string;
  companyId: string;
  title: string | null;
  format: string;
  latestRevisionNumber: number;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  updatedByAgentId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  issueId: string | null;
  key: string | null;
  issueTitle: string | null;
  issueIdentifier: string | null;
  agentName: string | null;
}

export interface CompanyDocumentDetail extends CompanyDocument {
  latestBody: string;
}

export const documentsApi = {
  list: (companyId: string) =>
    api.get<CompanyDocument[]>(`/companies/${companyId}/documents`),
  get: (companyId: string, documentId: string) =>
    api.get<CompanyDocumentDetail>(`/companies/${companyId}/documents/${documentId}`),
};
