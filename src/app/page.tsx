import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import AppHeader from "@/components/AppHeader";
import { CalendarPage } from "@/components/calendar/CalendarPage";
import { getBrands, getRegionGroups } from "@/lib/supabase/queries";
import {
  getStoresForPicker,
  getVisitsInRange,
} from "@/lib/supabase/calendar-queries";
import { getSyncStatus } from "@/app/actions/sheets";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  // 사용자가 캘린더에서 이전/다음 달로 자유롭게 이동해도 방문 표시가 끊기지 않도록
  // 넉넉하게 ±12개월을 미리 받아 둠.
  const from = format(startOfMonth(subMonths(now, 12)), "yyyy-MM-dd");
  const to = format(endOfMonth(addMonths(now, 12)), "yyyy-MM-dd");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

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
      <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:flex lg:h-[calc(100dvh-3.5rem)] lg:flex-col">
        <div className="flex items-baseline gap-x-3 whitespace-nowrap">
          <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
            캘린더
          </h1>
          <p className="text-xs text-neutral-500 sm:text-sm">
            날짜를 클릭해 방문을 등록하세요.
          </p>
        </div>
        <div className="mt-3 sm:mt-4 lg:min-h-0 lg:flex-1">
          <CalendarPage
            brands={brands}
            regionGroups={regionGroups}
            stores={stores}
            initialVisits={visits}
            sheetsConnected={syncStatus.connected}
            initialLastSyncedAt={syncStatus.lastSyncedAt}
            currentUserId={currentUserId}
          />
        </div>
      </main>
    </>
  );
}
