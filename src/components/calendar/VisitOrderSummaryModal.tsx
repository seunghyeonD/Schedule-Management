"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { VisitCell } from "@/lib/supabase/calendar-queries";
import {
  getOrderItemsForVisits,
  type VisitOrderItem,
} from "@/app/actions/visitOrders";

type Props = {
  date: Date;
  visits: VisitCell[];
  onClose: () => void;
};

export function VisitOrderSummaryModal({ date, visits, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<VisitOrderItem[]>([]);
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  const visitIds = useMemo(() => visits.map((v) => v.id), [visits]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getOrderItemsForVisits(visitIds);
      if (cancelled) return;
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setItems(res.items ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visitIds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // visit_id → items 매핑 (kind/sort_order 별 정렬은 서버에서 보장됨)
  const itemsByVisit = useMemo(() => {
    const map = new Map<string, VisitOrderItem[]>();
    for (const it of items) {
      const arr = map.get(it.visit_id) ?? [];
      arr.push(it);
      map.set(it.visit_id, arr);
    }
    return map;
  }, [items]);

  const totals = useMemo(() => {
    let orderQty = 0;
    let returnQty = 0;
    for (const it of items) {
      if (it.kind === "order") orderQty += it.quantity;
      else returnQty += it.quantity;
    }
    return { orderQty, returnQty };
  }, [items]);

  async function handleDownload() {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(receiptRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const link = document.createElement("a");
      const dateStr = format(date, "yyyy-MM-dd");
      link.download = `주문내역_${dateStr}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("[receipt download]", e);
      setError("이미지 생성에 실패했습니다");
    } finally {
      setDownloading(false);
    }
  }

  const dateLabel = format(date, "yyyy년 M월 d일 (E)", { locale: ko });
  const hasAnyItems = items.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="shrink-0 border-b border-neutral-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-neutral-900">
            주문내역 모아보기
          </h3>
        </header>

        <div className="flex-1 overflow-y-auto bg-neutral-100 p-5">
          {loading ? (
            <p className="py-10 text-center text-xs text-neutral-500">
              불러오는 중…
            </p>
          ) : (
            <div
              ref={receiptRef}
              className="mx-auto max-w-md bg-white px-6 py-6 font-mono text-base text-neutral-900 shadow"
              style={{ fontFamily: '"Courier New", "D2Coding", monospace' }}
            >
              <div className="text-center">
                <p className="text-xl font-bold">주문내역 영수증</p>
                <p className="mt-1.5 text-base text-neutral-700">
                  {dateLabel}
                </p>
              </div>

              <div className="my-4 border-t border-dashed border-neutral-400" />

              {!hasAnyItems ? (
                <p className="py-6 text-center text-base text-neutral-500">
                  기록된 주문/반품이 없습니다
                </p>
              ) : (
                <>
                  {visits.map((v) => {
                    const its = itemsByVisit.get(v.id) ?? [];
                    if (its.length === 0) return null;
                    const orders = its.filter((i) => i.kind === "order");
                    const returns = its.filter((i) => i.kind === "return");
                    const fullAddress = [
                      v.store?.address,
                      v.store?.address_detail,
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <div key={v.id} className="mb-5 last:mb-0">
                        <p className="text-lg font-bold">
                          [{v.visit_order}] {v.store?.name ?? "-"}
                        </p>
                        {v.store?.brand?.name && (
                          <p className="mt-0.5 text-sm text-neutral-600">
                            {v.store.brand.name}
                          </p>
                        )}
                        {fullAddress && (
                          <p className="mt-0.5 text-sm leading-snug text-neutral-600">
                            {fullAddress}
                          </p>
                        )}
                        <div className="my-2.5 border-t border-dotted border-neutral-300" />

                        {orders.length > 0 && (
                          <>
                            <p className="text-base font-semibold">주문</p>
                            <ul className="mt-1.5 space-y-1">
                              {orders.map((it) => (
                                <ItemLine
                                  key={it.id}
                                  name={it.product_name}
                                  qty={it.quantity}
                                />
                              ))}
                            </ul>
                          </>
                        )}

                        {returns.length > 0 && (
                          <>
                            <p
                              className={`text-base font-semibold ${orders.length > 0 ? "mt-3" : ""}`}
                            >
                              반품
                            </p>
                            <ul className="mt-1.5 space-y-1">
                              {returns.map((it) => (
                                <ItemLine
                                  key={it.id}
                                  name={it.product_name}
                                  qty={it.quantity}
                                />
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    );
                  })}

                  <div className="my-4 border-t border-dashed border-neutral-400" />
                  <div className="space-y-1 text-base">
                    <div className="flex justify-between">
                      <span>총 주문 수량</span>
                      <span className="tabular-nums">{totals.orderQty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>총 반품 수량</span>
                      <span className="tabular-nums">{totals.returnQty}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-200 bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-300 bg-white px-4 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading || downloading || !hasAnyItems}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {downloading ? "다운로드 중…" : "이미지 다운로드"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ItemLine({ name, qty }: { name: string; qty: number }) {
  return (
    <li className="flex items-baseline gap-2 text-base">
      <span className="shrink-0">{name}</span>
      <span
        aria-hidden
        className="min-w-[12px] flex-1 border-b border-dotted border-neutral-300"
        style={{ marginBottom: "5px" }}
      />
      <span className="shrink-0 tabular-nums">x {qty}</span>
    </li>
  );
}
