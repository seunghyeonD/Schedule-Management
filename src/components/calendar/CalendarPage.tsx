"use client";

import { useMemo, useOptimistic, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import type { Brand, RegionGroup } from "@/lib/types/db";
import type {
  StorePicker,
  VisitCell,
} from "@/lib/supabase/calendar-queries";
import { addVisit, deleteVisit } from "@/app/actions/visits";
import { VisitPanel } from "./VisitPanel";
import { SyncButton } from "./SyncButton";
import { brandColor } from "@/lib/brandColor";

type Props = {
  brands: Brand[];
  regionGroups: RegionGroup[];
  stores: StorePicker[];
  initialVisits: VisitCell[];
  sheetsConnected: boolean;
  initialLastSyncedAt: string | null;
  currentUserId: string | null;
  orgId: string | null;
};

type OptimisticAction =
  | { type: "add"; visit: VisitCell }
  | { type: "delete"; id: string };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarPage({
  brands,
  regionGroups,
  stores,
  initialVisits,
  sheetsConnected,
  initialLastSyncedAt,
  currentUserId,
  orgId,
}: Props) {
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date | null>(() => new Date());
  const dirtyRef = useRef<(() => void) | null>(null);
  const markDirty = () => dirtyRef.current?.();

  // 서버 액션이 끝나기 전에 UI에 즉시 반영. 액션 완료 시 props가 갱신되며
  // optimistic 상태는 자동으로 폐기됨.
  const [optimisticVisits, applyOptimistic] = useOptimistic<
    VisitCell[],
    OptimisticAction
  >(initialVisits, (state, action) => {
    if (action.type === "add") return [...state, action.visit];
    if (action.type === "delete")
      return state.filter((v) => v.id !== action.id);
    return state;
  });

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekCount = days.length / 7;

  const visitsByDate = useMemo(() => {
    const map = new Map<string, VisitCell[]>();
    for (const v of optimisticVisits) {
      const arr = map.get(v.visit_date) ?? [];
      arr.push(v);
      map.set(v.visit_date, arr);
    }
    for (const arr of Array.from(map.values())) {
      arr.sort((a: VisitCell, b: VisitCell) => a.visit_order - b.visit_order);
    }
    return map;
  }, [optimisticVisits]);

  const selectedKey = selected ? format(selected, "yyyy-MM-dd") : null;
  const selectedVisits = selectedKey
    ? visitsByDate.get(selectedKey) ?? []
    : [];

  // VisitPanel이 호출하는 핸들러 — startTransition 안에서 동작해야 useOptimistic 적용됨.
  // (VisitPanel의 startTransition으로 감싸진 콜체인에서 호출됨)
  const handleAddVisit = async (
    store: StorePicker,
    storeName: string,
    brandName: string,
    regionGroupName: string | null,
  ): Promise<{ error?: string }> => {
    if (!selected) return { error: "날짜를 선택하세요" };
    const visitDate = format(selected, "yyyy-MM-dd");
    const dayVisits = visitsByDate.get(visitDate) ?? [];

    const optimisticVisit: VisitCell = {
      id: `__optimistic_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      user_id: currentUserId ?? "",
      visit_date: visitDate,
      visit_order: dayVisits.length + 1,
      store_position: null,
      customer_count: null,
      sales_trend: null,
      activity: null,
      display_type: null,
      requests: null,
      photo_paths: [],
      store: {
        id: store.id,
        name: storeName,
        address: null,
        address_detail: null,
        deleted_at: null,
        brand: { id: store.brand_id, name: brandName },
        region_group: store.region_group_id
          ? { id: store.region_group_id, name: regionGroupName ?? "" }
          : null,
      },
      // 본인이 추가한 visit이라 어차피 본인 화면에서 굳이 라벨 안 띄워도 됨.
      // 다음 페이지 갱신 때 서버에서 마스터인 경우 recorder가 채워져 들어옴.
      recorder: null,
    };

    applyOptimistic({ type: "add", visit: optimisticVisit });
    const res = await addVisit({
      store_id: store.id,
      visit_date: visitDate,
    });
    if (!res?.error) markDirty();
    return res ?? {};
  };

  const handleDeleteVisit = async (
    visitId: string,
  ): Promise<{ error?: string }> => {
    applyOptimistic({ type: "delete", id: visitId });
    const res = await deleteVisit(visitId);
    if (!res?.error) markDirty();
    return res ?? {};
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:h-full lg:grid-cols-[460px_1fr]">
      <VisitPanel
        date={selected}
        visits={selectedVisits}
        brands={brands}
        regionGroups={regionGroups}
        stores={stores}
        currentUserId={currentUserId}
        orgId={orgId}
        onAddVisit={handleAddVisit}
        onDeleteVisit={handleDeleteVisit}
        onChange={markDirty}
      />

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white lg:flex lg:h-full lg:flex-col lg:min-h-0">
        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setMonth((d) => subMonths(d, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50"
              aria-label="이전 달"
            >
              ←
            </button>
            <h2 className="min-w-[100px] text-center text-sm font-semibold tabular-nums text-neutral-900 sm:min-w-[130px] sm:text-base">
              {format(month, "yyyy년 M월", { locale: ko })}
            </h2>
            <button
              onClick={() => setMonth((d) => addMonths(d, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50"
              aria-label="다음 달"
            >
              →
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const today = new Date();
                setMonth(today);
                setSelected(today);
              }}
              className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
            >
              오늘
            </button>
            <SyncButton
              connected={sheetsConnected}
              initialLastSyncedAt={initialLastSyncedAt}
              dirtyRef={dirtyRef}
            />
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-neutral-100 text-center text-[11px] font-medium">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-2 ${
                i === 0
                  ? "text-red-500"
                  : i === 6
                    ? "text-blue-500"
                    : "text-neutral-500"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        <div
          className="grid grid-cols-7 lg:flex-1 lg:min-h-0"
          style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
        >
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, month);
            const isSelected = selected && isSameDay(day, selected);
            const isToday = isSameDay(day, new Date());
            const dayVisits = visitsByDate.get(key) ?? [];
            const weekday = day.getDay();

            return (
              <button
                key={key}
                onClick={() => setSelected(day)}
                className={`group relative min-h-[72px] border-b border-r border-neutral-100 p-1.5 text-left transition sm:min-h-[120px] sm:p-2.5 lg:min-h-0 ${
                  isSelected
                    ? "bg-blue-50 ring-2 ring-inset ring-blue-400"
                    : "hover:bg-neutral-50"
                } ${!inMonth ? "bg-neutral-50/40" : ""}`}
              >
                <div className="flex items-center">
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full text-[11px] tabular-nums sm:h-6 sm:min-w-6 sm:text-xs ${
                      isToday
                        ? "bg-neutral-900 font-semibold text-white"
                        : !inMonth
                          ? "text-neutral-300"
                          : weekday === 0
                            ? "text-red-500"
                            : weekday === 6
                              ? "text-blue-500"
                              : "text-neutral-700"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {dayVisits.length > 0 && (
                  <>
                    {/* 모바일: 점 + 카운트 */}
                    <div className="mt-1.5 flex items-center gap-1 sm:hidden">
                      <div className="flex flex-wrap gap-1">
                        {dayVisits.slice(0, 4).map((v) => {
                          const c = brandColor(
                            v.store?.brand?.id,
                            v.store?.brand?.name,
                          );
                          return (
                            <span
                              key={v.id}
                              className={`block h-2 w-2 shrink-0 rounded-full ${c.hex ? "" : c.dot}`}
                              style={
                                c.hex ? { backgroundColor: c.hex } : undefined
                              }
                              aria-hidden
                            />
                          );
                        })}
                      </div>
                      {dayVisits.length > 4 && (
                        <span className="text-[10px] font-medium leading-none text-neutral-500">
                          +{dayVisits.length - 4}
                        </span>
                      )}
                      <span className="ml-auto text-[10px] font-semibold text-neutral-400">
                        {dayVisits.length}
                      </span>
                    </div>
                    {/* 데스크탑: 매장명까지 */}
                    <ul className="mt-1 hidden space-y-0.5 pl-3 sm:block">
                      {dayVisits.slice(0, 4).map((v) => {
                        const c = brandColor(
                          v.store?.brand?.id,
                          v.store?.brand?.name,
                        );
                        const recorderLabel = v.recorder
                          ? v.recorder.display_name?.trim() ||
                            v.recorder.email
                          : null;
                        return (
                          <li
                            key={v.id}
                            className="flex items-center gap-1.5 text-[11px] leading-tight text-neutral-700"
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.hex ? "" : c.dot}`}
                              style={
                                c.hex
                                  ? { backgroundColor: c.hex }
                                  : undefined
                              }
                              aria-hidden
                            />
                            <span className="shrink-0 text-[10px] tabular-nums text-neutral-400">
                              {v.visit_order}
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {v.store?.name ?? "-"}
                              {recorderLabel && (
                                <span className="text-neutral-400">
                                  {" · "}
                                  {recorderLabel}
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                      {dayVisits.length > 4 && (
                        <li className="text-[10px] text-neutral-400">
                          +{dayVisits.length - 4}개 더
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
