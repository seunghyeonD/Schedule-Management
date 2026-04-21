"use client";

import { useMemo, useRef, useState } from "react";
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
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarPage({
  brands,
  regionGroups,
  stores,
  initialVisits,
  sheetsConnected,
  initialLastSyncedAt,
}: Props) {
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const dirtyRef = useRef<(() => void) | null>(null);
  const markDirty = () => dirtyRef.current?.();

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const visitsByDate = useMemo(() => {
    const map = new Map<string, VisitCell[]>();
    for (const v of initialVisits) {
      const arr = map.get(v.visit_date) ?? [];
      arr.push(v);
      map.set(v.visit_date, arr);
    }
    return map;
  }, [initialVisits]);

  const selectedKey = selected ? format(selected, "yyyy-MM-dd") : null;
  const selectedVisits = selectedKey
    ? visitsByDate.get(selectedKey) ?? []
    : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth((d) => subMonths(d, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50"
              aria-label="이전 달"
            >
              ←
            </button>
            <h2 className="min-w-[130px] text-center text-base font-semibold tabular-nums text-neutral-900">
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

        <div className="grid grid-cols-7">
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
                className={`group relative min-h-[108px] border-b border-r border-neutral-100 p-2 text-left transition ${
                  isSelected
                    ? "bg-blue-50 ring-2 ring-inset ring-blue-400"
                    : "hover:bg-neutral-50"
                } ${!inMonth ? "bg-neutral-50/40" : ""}`}
              >
                <div className="flex items-center">
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center rounded-full text-xs tabular-nums ${
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
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {dayVisits.slice(0, 4).map((v) => {
                      const c = brandColor(v.store?.brand?.id);
                      return (
                        <li
                          key={v.id}
                          className="flex items-center gap-1.5 text-[11px] leading-tight text-neutral-700"
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`}
                            aria-hidden
                          />
                          <span className="shrink-0 text-[10px] tabular-nums text-neutral-400">
                            {v.visit_order}
                          </span>
                          <span className="truncate">
                            {v.store?.name ?? "-"}
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
                )}
              </button>
            );
          })}
        </div>
      </div>

      <VisitPanel
        date={selected}
        visits={selectedVisits}
        brands={brands}
        regionGroups={regionGroups}
        stores={stores}
        onChange={markDirty}
      />
    </div>
  );
}
