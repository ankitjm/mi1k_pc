import { api } from "./client";

export interface KnowledgeBuildResult {
  contextMarkdown: string;
  sources: Array<{ source: string; type: string; charCount: number }>;
  errors: Array<{ source: string; error: string }>;
}

export interface FileExtractResult {
  source: string;
  type: string;
  charCount: number;
  preview: string;
}

export interface UrlFetchResult {
  source: string;
  type: string;
  charCount: number;
  preview: string;
  metadata?: Record<string, string>;
}

export const knowledgeBaseApi = {
  build: async (
    companyId: string,
    data: {
      companyName: string;
      mission?: string;
      industry?: string;
      additionalContext?: string;
      links?: string[];
      files?: File[];
    },
  ): Promise<KnowledgeBuildResult> => {
    const form = new FormData();
    form.append("companyName", data.companyName);
    if (data.mission) form.append("mission", data.mission);
    if (data.industry) form.append("industry", data.industry);
    if (data.additionalContext) form.append("additionalContext", data.additionalContext);
    if (data.links && data.links.length > 0) {
      form.append("links", JSON.stringify(data.links));
    }
    if (data.files) {
      for (const file of data.files) {
        form.append("files", file);
      }
    }
    return api.postForm<KnowledgeBuildResult>(
      `/companies/${companyId}/knowledge-base/build`,
      form,
    );
  },

  extractFile: async (companyId: string, file: File): Promise<FileExtractResult> => {
    const form = new FormData();
    form.append("file", file);
    return api.postForm<FileExtractResult>(
      `/companies/${companyId}/knowledge-base/extract-file`,
      form,
    );
  },

  fetchUrl: async (companyId: string, url: string): Promise<UrlFetchResult> =>
    api.post<UrlFetchResult>(`/companies/${companyId}/knowledge-base/fetch-url`, { url }),
};
