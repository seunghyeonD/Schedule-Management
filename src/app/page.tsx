import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import AppHeader from "@/components/AppHeader";
import { CalendarPage } from "@/components/calendar/CalendarPage";
import { getBrands, getRegionGroups } from "@/lib/supabase/queries";
import {
  getStoresForPicker,
  getVisitsInRange,
} from "@/lib/supabase/calendar-queries";
import { getSyncStatus } from "@/app/actions/sheets";

export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const from = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const to = format(endOfMonth(addMonths(now, 1)), "yyyy-MM-dd");

  const [brands, regionGroups, stores, visits, syncStatus] = await Promise.all([
    getBrands(),
    getRegionGroups(),
    getStoresForPicker(),
    getVisitsInRange(from, to),
    getSyncStatus(),
  ]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-neutral-900">캘린더</h1>
        <p className="mt-1 text-sm text-neutral-500">
          날짜를 클릭해 방문을 등록하세요.
        </p>
        <div className="mt-6">
          <CalendarPage
            brands={brands}
            regionGroups={regionGroups}
            stores={stores}
            initialVisits={visits}
            sheetsConnected={syncStatus.connected}
            initialLastSyncedAt={syncStatus.lastSyncedAt}
          />
        </div>
      </main>
    </>
  );
}
