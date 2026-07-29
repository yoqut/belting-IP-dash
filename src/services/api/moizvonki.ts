import { request } from "./client";
import { MZCall, MZStats } from "@/types/moizvonki";
import { MZEmployee } from "@/lib/moizvonki";

export interface MoizvonkiResponse {
  calls: MZCall[];
  stats: MZStats;
  employees: MZEmployee[];
  from_cache?: boolean;
}

export function fetchMoizvonki(signal?: AbortSignal): Promise<MoizvonkiResponse> {
  return request<MoizvonkiResponse>("/api/moizvonki", { signal });
}
