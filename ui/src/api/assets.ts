import type { AssetImage } from "@paperclipai/shared";
import { api } from "./client";

export interface CompanyAsset {
  id: string;
  companyId: string;
  provider: string;
  objectKey: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  originalFilename: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  agentName: string | null;
  contentPath: string;
}

export interface WorkspaceFile {
  id: string;
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

export const assetsApi = {
  list: (companyId: string) =>
    api.get<CompanyAsset[]>(`/companies/${companyId}/assets`),

  uploadImage: async (companyId: string, file: File, namespace?: string) => {
    // Read file data into memory eagerly so the fetch body is self-contained.
    // Clipboard-paste File objects reference transient data that the browser may
    // discard after the paste-event handler returns, causing ERR_ACCESS_DENIED
    // when fetch() later tries to stream the FormData body.
    const buffer = await file.arrayBuffer();
    const safeFile = new File([buffer], file.name, { type: file.type });

    const form = new FormData();
    if (namespace && namespace.trim().length > 0) {
      form.append("namespace", namespace.trim());
    }
    form.append("file", safeFile);
    return api.postForm<AssetImage>(`/companies/${companyId}/assets/images`, form);
  },

  uploadCompanyLogo: async (companyId: string, file: File) => {
    const buffer = await file.arrayBuffer();
    const safeFile = new File([buffer], file.name, { type: file.type });

    const form = new FormData();
    form.append("file", safeFile);
    return api.postForm<AssetImage>(`/companies/${companyId}/logo`, form);
  },

  listWorkspaceFiles: (companyId: string) =>
    api.get<WorkspaceFile[]>(`/companies/${companyId}/workspace-files`),
};
