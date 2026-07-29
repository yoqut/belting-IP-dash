"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSettings, saveSettings } from "@/services/api/settings";
import { queryKeys } from "@/services/queryKeys";
import { toErrorMessage } from "@/services/api/client";
import { EmployeeLink } from "@/types/unified";

const EMPTY_LINKS: EmployeeLink[] = [];

/**
 * Sozlamalar sahifasi — server state (`useQuery`) va tahrirlanayotgan
 * qoralama (`draft`) ajratilgan. Foydalanuvchi jadvalni o'zgartirayotganda
 * serverdagi qiymat tegilmaydi; "Saqlash" bosilgandagina yuboriladi.
 */
export function useSettings() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<EmployeeLink[] | null>(null);

  const query = useQuery({
    queryKey: queryKeys.settings(),
    queryFn: ({ signal }) => fetchSettings(signal),
  });

  // Server ma'lumoti birinchi marta kelganda qoralamani to'ldiramiz.
  // `draft === null` sharti fondagi qayta so'rov tahrirlarni bosib ketishining
  // oldini oladi. `useEffect` o'rniga render paytida to'g'rilash ishlatilgan —
  // shart bir marta bajariladi, ortiqcha render sikli bo'lmaydi.
  if (draft === null && query.data) {
    setDraft(query.data.settings?.employees ?? EMPTY_LINKS);
  }

  const mutation = useMutation({
    mutationFn: (employees: EmployeeLink[]) => saveSettings({ employees }),
    onSuccess: () => {
      // Saqlangandan keyin dashboarddagi ism-bog'lanishlar ham eskiradi
      queryClient.invalidateQueries({ queryKey: queryKeys.settings() });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
  });

  const employees = draft ?? EMPTY_LINKS;

  return {
    employees,
    mzList: query.data?.mzEmployees ?? [],
    yeastarList: query.data?.yeastarEmployees ?? [],
    isLoading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : null,

    updateRow: (index: number, field: keyof EmployeeLink, value: string) => {
      setDraft(prev => (prev ?? []).map((e, i) => (i === index ? { ...e, [field]: value } : e)));
      mutation.reset();
    },
    addRow: () => {
      setDraft(prev => [...(prev ?? []), { displayName: "", mzEmail: "", yeastarExtName: "" }]);
      mutation.reset();
    },
    removeRow: (index: number) => {
      setDraft(prev => (prev ?? []).filter((_, i) => i !== index));
      mutation.reset();
    },

    save: () => mutation.mutate(employees),
    isSaving: mutation.isPending,
    isSaved: mutation.isSuccess,
    saveError: mutation.error ? toErrorMessage(mutation.error) : null,
  };
}
