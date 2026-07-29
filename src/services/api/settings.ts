import { request } from "./client";
import { AppSettings } from "@/types/unified";
import { MZEmployee } from "@/lib/moizvonki";

export interface YeastarEmployee {
  number: string;
  name: string;
}

export interface SettingsResponse {
  settings: AppSettings;
  mzEmployees: MZEmployee[];
  yeastarEmployees: YeastarEmployee[];
}

export function fetchSettings(signal?: AbortSignal): Promise<SettingsResponse> {
  return request<SettingsResponse>("/api/settings", { signal });
}

export function saveSettings(settings: AppSettings): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/settings", { method: "POST", body: settings });
}
