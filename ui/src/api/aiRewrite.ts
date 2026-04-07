import { api } from "./client";

export const aiRewriteApi = {
  rewrite: (companyId: string, text: string, context?: string) =>
    api.post<{ original: string; rewritten: string }>(
      `/companies/${companyId}/ai/rewrite`,
      { text, context },
    ),
};
