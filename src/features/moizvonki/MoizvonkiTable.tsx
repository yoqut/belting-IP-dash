"use client";

import { memo } from "react";
import { MZCall } from "@/types/moizvonki";
import { AnsweredBadge, Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatDuration, formatUnixTime } from "@/utils/format";

const COLUMNS = ["Vaqt", "Xodim", "Yo'nalish", "Mijoz raqami", "Mijoz ismi", "Holat", "Davomiylik", "Yozuv"];

interface RowProps {
  call: MZCall;
  employeeName: string;
}

const MoizvonkiRow = memo(function MoizvonkiRow({ call, employeeName }: RowProps) {
  const isInbound = call.direction === 0;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
      <td className="px-4 py-2.5 text-gray-600 dark:text-slate-400 whitespace-nowrap">{formatUnixTime(call.start_time)}</td>
      <td className="px-4 py-2.5 text-gray-800 dark:text-slate-200 font-medium">{employeeName}</td>
      <td className="px-4 py-2.5">
        <Badge tone={isInbound ? "blue" : "purple"}>{isInbound ? "Kiruvchi" : "Chiquvchi"}</Badge>
      </td>
      <td className="px-4 py-2.5 text-gray-800 dark:text-slate-200 font-mono">{call.client_number}</td>
      <td className="px-4 py-2.5 text-gray-600 dark:text-slate-400">{call.client_name ?? "—"}</td>
      <td className="px-4 py-2.5"><AnsweredBadge answered={call.answered === 1} /></td>
      <td className="px-4 py-2.5 text-gray-600 dark:text-slate-400">{formatDuration(call.duration)}</td>
      <td className="px-4 py-2.5">
        {call.recording ? (
          <a
            href={call.recording}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-xs"
          >
            Tinglash
          </a>
        ) : (
          <span className="text-gray-300 dark:text-slate-600">—</span>
        )}
      </td>
    </tr>
  );
});

interface Props {
  calls: MZCall[];
  employeeMap: Map<string, string>;
  loading: boolean;
}

const MoizvonkiTable = memo(function MoizvonkiTable({ calls, employeeMap, loading }: Props) {
  if (loading) return <TableSkeleton columns={COLUMNS.length} />;
  if (calls.length === 0) return <EmptyState message="Bugun qo'ng'iroq yo'q" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            {COLUMNS.map(col => (
              <th key={col} className="px-4 py-3 text-left font-medium">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
          {calls.map((call, i) => (
            <MoizvonkiRow
              key={call.db_call_id ?? `row-${i}`}
              call={call}
              // Ism sozlamalardan keladi; topilmasa akkaunt (email) ko'rsatiladi
              employeeName={call.user_account ? (employeeMap.get(call.user_account) ?? call.user_account) : "—"}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default MoizvonkiTable;
