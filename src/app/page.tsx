"use client";

import { useCallback, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ErrorAlert, WarningAlert } from "@/components/ui/Feedback";
import { SearchInput } from "@/components/ui/Controls";
import DashboardHeader from "@/features/dashboard/DashboardHeader";
import StatGrid from "@/features/dashboard/StatGrid";
import FilterDrawer from "@/features/dashboard/FilterDrawer";
import PaginationBar from "@/features/dashboard/PaginationBar";
import CallTable from "@/features/dashboard/CallTable";
import { useCalls } from "@/hooks/useCalls";
import { useCallFilters } from "@/hooks/useCallFilters";
import { useFilteredCalls } from "@/hooks/useFilteredCalls";
import { countActiveFilters, hasAnyFilter } from "@/utils/calls";
import { DateRange, todayRange } from "@/utils/date";

/**
 * Qo'ng'iroqlar dashboardi — faqat kompozitsiya.
 *
 * Barcha mas'uliyatlar ajratilgan:
 *   • server state  → `useCalls` (React Query: kesh, dedupe, bekor qilish)
 *   • UI state      → `useCallFilters` (reducer: filter + kesim + pagination)
 *   • hisob-kitob   → `useFilteredCalls` (bosqichma-bosqich memoizatsiya)
 *   • ko'rinish     → `features/dashboard/*`
 */
export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(todayRange);
  const [dismissedPbxError, setDismissedPbxError] = useState(false);

  const { calls, pbxError, isLoading, isRefreshing, error, dataUpdatedAt, refetch, refresh } = useCalls(range);
  const { filters, activeGroup, page, pageSize, setFilter, setSearch, resetFilters, selectGroup, setPage, setPageSize, resetAll } =
    useCallFilters();

  const { stats, visibleCalls, pageItems, totalPages, employeeNames, filteredCalls } =
    useFilteredCalls({ calls, filters, activeGroup, page, pageSize });

  // Sana oralig'i o'zgarganda filterlar mos kelmay qolishi mumkin (masalan,
  // tanlangan xodim yangi oraliqda umuman qo'ng'iroq qilmagan) — tozalaymiz.
  const handleRangeChange = useCallback((next: DateRange) => {
    setRange(next);
    resetAll();
    setDismissedPbxError(false);
  }, [resetAll]);

  const handleRefresh = useCallback(() => {
    setDismissedPbxError(false);
    void refresh();
  }, [refresh]);

  const showPbxError = !!pbxError && !dismissedPbxError;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("uz-UZ") : null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex flex-col">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <DashboardHeader
        title="Qo'ng'iroqlar"
        range={range}
        onRangeChange={handleRangeChange}
        onOpenSidebar={() => setSidebarOpen(true)}
        onToggleFilters={() => setDrawerOpen(v => !v)}
        filtersHighlighted={drawerOpen || hasAnyFilter(filters)}
        activeFilterCount={countActiveFilters(filters)}
        onRefresh={handleRefresh}
        refreshDisabled={isRefreshing || isLoading}
        refreshSpinning={isRefreshing}
        lastUpdatedLabel={lastUpdated}
      />

      <main className="flex-1 p-4 space-y-3">
        <StatGrid
          stats={stats}
          totalCount={filteredCalls.length}
          activeGroup={activeGroup}
          onSelect={selectGroup}
        />

        {showPbxError && (
          <WarningAlert
            title="PBX qo'ng'iroqlari yuklanmadi"
            detail={pbxError}
            onDismiss={() => setDismissedPbxError(true)}
          />
        )}

        <FilterDrawer
          open={drawerOpen}
          filters={filters}
          employeeNames={employeeNames}
          onChange={setFilter}
          onClear={resetFilters}
          onClose={() => setDrawerOpen(false)}
        />

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {error && <div className="p-3"><ErrorAlert message={error} onRetry={() => void refetch()} /></div>}

          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700">
            <SearchInput
              value={filters.search}
              onChange={setSearch}
              placeholder="Xodim, raqam yoki mijoz..."
              className="flex-1 max-w-xs"
            />
            <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">{visibleCalls.length} ta</span>
          </div>

          <CallTable records={pageItems} loading={isLoading} />
        </div>
      </main>

      <PaginationBar
        page={Math.min(page, totalPages)}
        pageSize={pageSize}
        totalItems={visibleCalls.length}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
