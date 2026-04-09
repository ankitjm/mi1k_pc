import { api } from "./client";

export interface WikiEntry {
  filePath: string;
  agent: string;
  date: string;
  type: string;
  tags: string[];
  source?: string;
  title: string;
  body: string;
}

export interface WikiListResponse {
  entries: WikiEntry[];
  wikiDir: string;
}

export const wikiApi = {
  listEntries: (): Promise<WikiListResponse> =>
    api.get<WikiListResponse>(`/wiki/entries`),
};
