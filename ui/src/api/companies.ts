import type {
  Company,
  CompanyPortabilityExportRequest,
  CompanyPortabilityExportPreviewResult,
  CompanyPortabilityExportResult,
  CompanyPortabilityImportRequest,
  CompanyPortabilityImportResult,
  CompanyPortabilityPreviewRequest,
  CompanyPortabilityPreviewResult,
  UpdateCompanyBranding,
} from "@paperclipai/shared";
import { api } from "./client";

export type CompanyStats = Record<string, { agentCount: number; issueCount: number }>;

export const companiesApi = {
  list: () => api.get<Company[]>("/companies"),
  get: (companyId: string) => api.get<Company>(`/companies/${companyId}`),
  stats: () => api.get<CompanyStats>("/companies/stats"),
  create: (data: {
    name: string;
    description?: string | null;
    budgetMonthlyCents?: number;
  }) =>
    api.post<Company>("/companies", data),
  update: (
    companyId: string,
    data: Partial<
      Pick<
        Company,
        | "name"
        | "description"
        | "status"
        | "budgetMonthlyCents"
        | "requireBoardApprovalForNewAgents"
        | "feedbackDataSharingEnabled"
        | "brandColor"
        | "logoAssetId"
      >
    >,
  ) => api.patch<Company>(`/companies/${companyId}`, data),
  updateBranding: (companyId: string, data: UpdateCompanyBranding) =>
    api.patch<Company>(`/companies/${companyId}/branding`, data),
  archive: (companyId: string) => api.post<Company>(`/companies/${companyId}/archive`, {}),
  remove: (companyId: string) => api.delete<{ ok: true }>(`/companies/${companyId}`),
  exportBundle: (
    companyId: string,
    data: CompanyPortabilityExportRequest,
  ) =>
    api.post<CompanyPortabilityExportResult>(`/companies/${companyId}/export`, data),
  exportPreview: (
    companyId: string,
    data: CompanyPortabilityExportRequest,
  ) =>
    api.post<CompanyPortabilityExportPreviewResult>(`/companies/${companyId}/exports/preview`, data),
  exportPackage: (
    companyId: string,
    data: CompanyPortabilityExportRequest,
  ) =>
    api.post<CompanyPortabilityExportResult>(`/companies/${companyId}/exports`, data),
  importPreview: (data: CompanyPortabilityPreviewRequest) =>
    api.post<CompanyPortabilityPreviewResult>("/companies/import/preview", data),
  importBundle: (data: CompanyPortabilityImportRequest) =>
    api.post<CompanyPortabilityImportResult>("/companies/import", data),
  getProviderApiKeys: (companyId: string) =>
    api.get<{ keys: Record<string, string> }>(`/companies/${companyId}/provider-api-keys`),
  setProviderApiKey: (companyId: string, provider: string, value: string) =>
    api.put<{ ok: true }>(`/companies/${companyId}/provider-api-keys`, { provider, value }),
  deleteProviderApiKey: (companyId: string, provider: string) =>
    api.delete<{ ok: true }>(`/companies/${companyId}/provider-api-keys/${provider}`),
  getModelPolicy: (companyId: string) =>
    api.get<{ policy: Record<string, unknown> }>(`/companies/${companyId}/model-policy`),
  updateModelPolicy: (companyId: string, policy: Record<string, unknown>) =>
    api.put<{ ok: true }>(`/companies/${companyId}/model-policy`, { policy }),
};
