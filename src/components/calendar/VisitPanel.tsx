"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Brand, RegionGroup } from "@/lib/types/db";
import type {
  StorePicker,
  VisitCell,
} from "@/lib/supabase/calendar-queries";
import { brandColor } from "@/lib/brandColor";
import { VisitMemoModal } from "./VisitMemoModal";
import { VisitOrderModal } from "./VisitOrderModal";
import { VisitOrderSummaryModal } from "./VisitOrderSummaryModal";
import { StoreForm } from "@/components/stores/StoreForm";
import { StoreEditModal } from "@/components/stores/StoreEditModal";
import type { StoreWithRelations } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/client";

type Props = {
  date: Date | null;
  visits: VisitCell[];
  brands: Brand[];
  regionGroups: RegionGroup[];
  stores: StorePicker[];
  currentUserId: string | null;
  orgId: string | null;
  onAddVisit: (
    store: StorePicker,
    storeName: string,
    brandName: string,
    regionGroupName: string | null,
  ) => Promise<{ error?: string }>;
  onDeleteVisit: (visitId: string) => Promise<{ error?: string }>;
  onChange?: () => void;
};

export function VisitPanel({
  date,
  visits,
  brands,
  regionGroups,
  stores,
  currentUserId,
  orgId,
  onAddVisit,
  onDeleteVisit,
  onChange,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [memoVisit, setMemoVisit] = useState<VisitCell | null>(null);
  const [orderVisit, setOrderVisit] = useState<VisitCell | null>(null);
  const [actionVisit, setActionVisit] = useState<VisitCell | null>(null);
  const [editStore, setEditStore] = useState<StoreWithRelations | null>(null);
  const [editStoreLoading, setEditStoreLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStoreFormOpen, setIsStoreFormOpen] = useState(false);
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(
    new Set(),
  );

  const handleAddClick = () => {
    setIsAddModalOpen(true);
    setIsStoreFormOpen(false);
    setSelectedStoreIds(new Set());
    setError(null);
  };

  const toggleStoreSelected = (id: string) => {
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!isAddModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAddModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAddModalOpen]);

  useEffect(() => {
    if (!actionVisit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActionVisit(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actionVisit]);

  const openVisitMenu = (v: VisitCell) => {
    const isOwn = !!currentUserId && v.user_id === currentUserId;
    if (!isOwn) {
      setMemoVisit(v);
      return;
    }
    setActionVisit(v);
  };

  const handleEditStoreFromVisit = async (storeId: string | undefined) => {
    if (!storeId) return;
    setActionVisit(null);
    setEditStoreLoading(true);
    const supabase = createClient();
    const { data, error: fetchErr } = await supabase
      .from("stores")
      .select("*, brand:brands(id, name), region_group:region_groups(id, name)")
      .eq("id", storeId)
      .maybeSingle();
    setEditStoreLoading(false);
    if (fetchErr || !data) return;
    setEditStore(data as StoreWithRelations);
  };

  const handleDeleteVisitFromMenu = (visitId: string) => {
    if (
      !confirm("이 방문 기록을 삭제할까요? (매장 자체는 삭제되지 않습니다)")
    )
      return;
    setActionVisit(null);
    startTransition(async () => {
      const res = await onDeleteVisit(visitId);
      if (!res?.error) onChange?.();
    });
  };

  // 이미 해당 날짜에 등록된 매장 id 모음
  const existingStoreIds = useMemo(
    () => new Set(visits.map((v) => v.store?.id).filter(Boolean) as string[]),
    [visits],
  );

  function handleConfirmAddVisits() {
    if (!date || selectedStoreIds.size === 0) return;
    const selected = stores.filter((s) => selectedStoreIds.has(s.id));
    setError(null);
    startTransition(async () => {
      let firstError: string | null = null;
      for (const s of selected) {
        const brand = brands.find((b) => b.id === s.brand_id);
        const regionGroup = regionGroups.find(
          (g) => g.id === s.region_group_id,
        );
        const res = await onAddVisit(
          s,
          s.name,
          brand?.name ?? "",
          regionGroup?.name ?? null,
        );
        if (res?.error) {
          firstError = res.error;
          break;
        }
      }
      if (firstError) {
        setError(firstError);
      } else {
        setSelectedStoreIds(new Set());
        setIsAddModalOpen(false);
        onChange?.();
      }
    });
  }

  if (!date) {
    return (
      <aside className="flex items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-400 lg:h-full">
        캘린더에서 날짜를 선택하세요
      </aside>
    );
  }

  return (
    <aside className="rounded-2xl border border-neutral-200 bg-white lg:flex lg:h-full lg:flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4 lg:shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-neutral-900">
            {format(date, "yyyy년 M월 d일 (E)", { locale: ko })}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">방문 {visits.length}건</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={handleAddClick}
              className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800"
            >
              <span aria-hidden>+</span>
              <span>일정추가</span>
            </button>
            {visits.length === 0 && (
              <div
                role="tooltip"
                className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 whitespace-nowrap rounded-md bg-neutral-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg"
              >
                방문일정을 추가해주세요.
                <span
                  aria-hidden
                  className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 bg-neutral-900"
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsOrderSummaryOpen(true)}
            disabled={visits.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            주문내역 모아보기
          </button>
        </div>
      </header>

      <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:rounded-b-2xl">
      <section className="px-5 py-4">
        {visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-300"
              aria-hidden
            >
              <rect x="3" y="4.5" width="18" height="16" rx="2" />
              <path d="M3 9.5h18" />
              <path d="M8 3v3" />
              <path d="M16 3v3" />
            </svg>
            <p className="text-xl font-bold text-neutral-800">
              등록된 방문이 없습니다
            </p>
            <p className="text-sm text-neutral-500">
              우측 상단의 <span className="font-semibold text-neutral-700">+ 일정추가</span> 버튼으로 방문을 등록해 보세요
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visits.map((v) => {
              const c = brandColor(v.store?.brand?.id);
              const recorderLabel = v.recorder
                ? v.recorder.display_name?.trim() || v.recorder.email
                : null;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => openVisitMenu(v)}
                    className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left transition hover:border-neutral-400 hover:bg-neutral-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold tabular-nums text-neutral-700">
                      {v.visit_order}
                    </span>
                    <span
                      aria-hidden
                      className={`h-3 w-3 shrink-0 rounded-full ${c.dot}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-neutral-900">
                        {v.store?.name ?? "-"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {v.store?.brand?.name ?? "-"}
                        {recorderLabel && (
                          <>
                            <span className="mx-1">·</span>
                            {recorderLabel}
                          </>
                        )}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="shrink-0 text-base leading-none text-neutral-300"
                    >
                      ›
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      </div>

      {actionVisit && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setActionVisit(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3">
              <h3 className="truncate text-sm font-semibold text-neutral-900">
                {actionVisit.store?.name ?? "방문"}
              </h3>
              <button
                type="button"
                onClick={() => setActionVisit(null)}
                aria-label="닫기"
                className="rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
              >
                ✕
              </button>
            </header>
            <div className="grid grid-cols-1 gap-1 p-2">
              <button
                type="button"
                onClick={() => {
                  setMemoVisit(actionVisit);
                  setActionVisit(null);
                }}
                className="rounded-md px-4 py-3 text-left text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
              >
                상세정보 입력
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderVisit(actionVisit);
                  setActionVisit(null);
                }}
                className="rounded-md px-4 py-3 text-left text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
              >
                주문내역 입력
              </button>
              <button
                type="button"
                onClick={() => handleEditStoreFromVisit(actionVisit.store?.id)}
                className="rounded-md px-4 py-3 text-left text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
              >
                매장정보수정
              </button>
              <button
                type="button"
                onClick={() => handleDeleteVisitFromMenu(actionVisit.id)}
                disabled={isPending}
                className="rounded-md px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {editStoreLoading && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        >
          <div className="rounded-md bg-white px-4 py-2 text-xs text-neutral-700 shadow">
            매장 정보 불러오는 중…
          </div>
        </div>
      )}

      {editStore && (
        <StoreEditModal
          store={editStore}
          brands={brands}
          regionGroups={regionGroups}
          orgId={orgId}
          onClose={() => setEditStore(null)}
          onSaved={onChange}
        />
      )}

      {memoVisit && (
        <VisitMemoModal
          visit={memoVisit}
          currentUserId={currentUserId}
          onClose={() => setMemoVisit(null)}
          onSaved={onChange}
        />
      )}

      {orderVisit && (
        <VisitOrderModal
          visit={orderVisit}
          currentUserId={currentUserId}
          onClose={() => setOrderVisit(null)}
          onSaved={onChange}
        />
      )}

      {isOrderSummaryOpen && (
        <VisitOrderSummaryModal
          date={date}
          visits={visits}
          onClose={() => setIsOrderSummaryOpen(false)}
        />
      )}

      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-neutral-900">
                  {format(date, "yyyy년 M월 d일 (E)", { locale: ko })}
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  매장 {stores.length}개
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isStoreFormOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsStoreFormOpen(false)}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
                  >
                    ← 목록
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsStoreFormOpen(true)}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800"
                  >
                    <span aria-hidden>+</span>
                    <span>매장 추가</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
            </header>

            {isStoreFormOpen ? (
              <div className="flex flex-1 min-h-0 flex-col">
                <StoreForm
                  brands={brands}
                  regionGroups={regionGroups}
                  orgId={orgId}
                  submitLabel="완료"
                  submitFullWidth
                  onCreated={() => {
                    setIsStoreFormOpen(false);
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-1 min-h-0 flex-col">
                {stores.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-2xl font-bold text-neutral-800">
                      추가된 매장이 없습니다
                    </p>
                    <p className="text-sm text-neutral-400">
                      우측 상단의 <span className="font-semibold text-neutral-600">+ 매장 추가</span> 버튼으로 매장을 추가해 보세요
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto px-5 py-4">
                      <ul className="space-y-2">
                        {stores.map((s) => {
                          const checked = selectedStoreIds.has(s.id);
                          const alreadyAdded = existingStoreIds.has(s.id);
                          const brand = brands.find(
                            (b) => b.id === s.brand_id,
                          );
                          const c = brandColor(s.brand_id);
                          return (
                            <li key={s.id}>
                              <label
                                className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition ${
                                  alreadyAdded
                                    ? "cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-60"
                                    : checked
                                      ? "cursor-pointer border-point bg-blue-50"
                                      : "cursor-pointer border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={alreadyAdded}
                                  checked={checked}
                                  onChange={() => toggleStoreSelected(s.id)}
                                  className="h-5 w-5 shrink-0 rounded border-neutral-300 text-point focus:ring-point"
                                />
                                <span
                                  aria-hidden
                                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`}
                                />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
                                  {s.name}
                                </span>
                                {brand?.name && (
                                  <span className="shrink-0 text-xs text-neutral-500">
                                    {brand.name}
                                  </span>
                                )}
                                {alreadyAdded && (
                                  <span className="shrink-0 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                                    등록됨
                                  </span>
                                )}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="shrink-0 border-t border-neutral-100 bg-white px-5 py-3">
                      {error && (
                        <p className="mb-2 text-sm text-red-600">{error}</p>
                      )}
                      <button
                        type="button"
                        disabled={
                          selectedStoreIds.size === 0 || isPending
                        }
                        onClick={handleConfirmAddVisits}
                        className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        완료
                        {selectedStoreIds.size > 0
                          ? ` (${selectedStoreIds.size})`
                          : ""}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

