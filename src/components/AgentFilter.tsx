"use client";

import { CDRRecord } from "@/types/cdr";

interface AgentStat {
  number: string;
  name: string;
  total: number;
  answered: number;
  missed: number;
}

interface Props {
  records: CDRRecord[];
  selectedAgent: string | null;
  onChange: (agent: string | null) => void;
}

function buildAgentStats(records: CDRRecord[]): AgentStat[] {
  const map = new Map<string, AgentStat>();

  for (const r of records) {
    if (r.call_type !== "Inbound" && r.call_type !== "Internal") continue;

    const num = r.call_to_number;
    if (!num) continue;

    if (!map.has(num)) {
      map.set(num, {
        number: num,
        name: r.call_to_name || num,
        total: 0,
        answered: 0,
        missed: 0,
      });
    }

    const stat = map.get(num)!;
    stat.total++;
    if (r.disposition === "ANSWERED") stat.answered++;
    else stat.missed++;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export default function AgentFilter({ records, selectedAgent, onChange }: Props) {
  const agents = buildAgentStats(records);

  if (!agents.length) return null;

  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 mr-1">Kimga:</span>
        <button
          onClick={() => onChange(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            selectedAgent === null
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
          }`}
        >
          Barchasi
        </button>
        {agents.map((a) => {
          const isActive = selectedAgent === a.number;
          const missedPct = a.total > 0 ? Math.round((a.missed / a.total) * 100) : 0;
          return (
            <button
              key={a.number}
              onClick={() => onChange(isActive ? null : a.number)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
              }`}
            >
              <span>{a.name !== a.number ? a.name : `#${a.number}`}</span>
              <span
                className={`inline-flex items-center gap-0.5 ${
                  isActive ? "text-blue-200" : "text-gray-400"
                }`}
              >
                <span className={isActive ? "text-white font-bold" : "text-gray-800 font-bold"}>
                  {a.total}
                </span>
                {a.missed > 0 && (
                  <span className={`${isActive ? "text-red-200" : "text-red-500"}`}>
                    ({missedPct}% miss)
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
