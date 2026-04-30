"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useEffect, useState, useTransition } from "react";
import type { VisitCell } from "@/lib/supabase/calendar-queries";
import {
  getVisitOrderItems,
  saveVisitOrderItems,
} from "@/app/actions/visitOrders";

type Props = {
  visit: VisitCell;
  currentUserId: string | null;
  onClose: () => void;
  onSaved?: () => void;
};

type Row = {
  key: string;
  product_name: string;
  quantity: string;
  is_completed: boolean;
};

// 임시 row id 생성 (DB key 와 분리, 클라 입력 추적용)
const newKey = () =>
  `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const blankRow = (): Row => ({
  key: newKey(),
  product_name: "",
  quantity: "",
  is_completed: false,
});

export function VisitOrderModal({
  visit,
  currentUserId,
  onClose,
  onSaved,
}: Props) {
  const readOnly = !currentUserId || visit.user_id !== currentUserId;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Row[]>([blankRow()]);
  const [returns, setReturns] = useState<Row[]>([blankRow()]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getVisitOrderItems(visit.id);
      if (cancelled) return;
      if (res.error) {
        setError(`불러오기 실패: ${res.error}`);
        setLoading(false);
        return;
      }
      const items = res.items ?? [];
      const o = items
        .filter((i) => i.kind === "order")
        .map((i) => ({
          key: i.id,
          product_name: i.product_name,
          quantity: String(i.quantity ?? ""),
          is_completed: !!i.is_completed,
        }));
      const r = items
        .filter((i) => i.kind === "return")
        .map((i) => ({
          key: i.id,
          product_name: i.product_name,
          quantity: String(i.quantity ?? ""),
          is_completed: !!i.is_completed,
        }));
      setOrders(o.length > 0 ? o : [blankRow()]);
      setReturns(r.length > 0 ? r : [blankRow()]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visit.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function updateRow(
    setRows: React.Dispatch<React.SetStateAction<Row[]>>,
    key: string,
    field: "product_name" | "quantity",
    value: string,
  ) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  }

  function toggleCompleted(
    setRows: React.Dispatch<React.SetStateAction<Row[]>>,
    key: string,
    next: boolean,
  ) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, is_completed: next } : r)),
    );
  }

  function removeRow(
    setRows: React.Dispatch<React.SetStateAction<Row[]>>,
    rows: Row[],
    key: string,
  ) {
    if (rows.length === 1) {
      // 마지막 행은 삭제 대신 비우기 — 폼 구조 유지
      setRows([blankRow()]);
      return;
    }
    setRows(rows.filter((r) => r.key !== key));
  }

  function addRow(setRows: React.Dispatch<React.SetStateAction<Row[]>>) {
    setRows((prev) => [...prev, blankRow()]);
  }

  function handleSave() {
    setError(null);

    // 빈 행은 저장 대상에서 제외 — 상품명 비어있으면 skip
    const collect = (rows: Row[], kind: "order" | "return") =>
      rows
        .map((r, idx) => ({
          kind,
          product_name: r.product_name.trim(),
          quantity: r.quantity.trim(),
          is_completed: r.is_completed,
          sort_order: idx,
        }))
        .filter((r) => r.product_name.length > 0);

    const items = [...collect(orders, "order"), ...collect(returns, "return")];

    startTransition(async () => {
      const res = await saveVisitOrderItems({
        visit_id: visit.id,
        items,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      onSaved?.();
      onClose();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-neutral-900">
              {visit.store?.name ?? "방문"} 주문내역
              {readOnly && (
                <span className="ml-2 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                  읽기 전용
                </span>
              )}
            </h3>
            <p className="text-xs text-neutral-500">
              {format(parseISO(visit.visit_date), "yyyy년 M월 d일 (E)", {
                locale: ko,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-neutral-500 hover:text-neutral-900"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-6 text-center text-xs text-neutral-400">
              불러오는 중…
            </p>
          ) : (
            <>
              <Section
                title="주문"
                rows={orders}
                readOnly={readOnly}
                onChange={(key, field, value) =>
                  updateRow(setOrders, key, field, value)
                }
                onToggleCompleted={(key, next) =>
                  toggleCompleted(setOrders, key, next)
                }
                onRemove={(key) => removeRow(setOrders, orders, key)}
                onAdd={() => addRow(setOrders)}
              />

              <div className="my-5 border-t border-neutral-200" />

              <Section
                title="반품"
                rows={returns}
                readOnly={readOnly}
                onChange={(key, field, value) =>
                  updateRow(setReturns, key, field, value)
                }
                onToggleCompleted={(key, next) =>
                  toggleCompleted(setReturns, key, next)
                }
                onRemove={(key) => removeRow(setReturns, returns, key)}
                onAdd={() => addRow(setReturns)}
              />
            </>
          )}

          {error && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-300 bg-white px-4 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            {readOnly ? "닫기" : "취소"}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || loading}
              className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {isPending ? "저장 중…" : "저장"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Section({
  title,
  rows,
  readOnly,
  onChange,
  onToggleCompleted,
  onRemove,
  onAdd,
}: {
  title: string;
  rows: Row[];
  readOnly: boolean;
  onChange: (
    key: string,
    field: "product_name" | "quantity",
    value: string,
  ) => void;
  onToggleCompleted: (key: string, next: boolean) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-neutral-800">{title}</h4>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-wrap items-center gap-2">
            <input
              value={r.product_name}
              onChange={(e) => onChange(r.key, "product_name", e.target.value)}
              placeholder="상품명"
              readOnly={readOnly}
              className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm read-only:bg-neutral-50 read-only:text-neutral-700"
            />
            <input
              value={r.quantity}
              onChange={(e) => onChange(r.key, "quantity", e.target.value)}
              placeholder="수량"
              readOnly={readOnly}
              className="w-24 rounded-md border border-neutral-300 px-3 py-1.5 text-sm read-only:bg-neutral-50 read-only:text-neutral-700"
            />
            <label
              className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${
                r.is_completed
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-neutral-200 bg-white text-neutral-500"
              } ${readOnly ? "pointer-events-none opacity-70" : "cursor-pointer hover:border-neutral-400"}`}
            >
              <input
                type="checkbox"
                checked={r.is_completed}
                onChange={(e) => onToggleCompleted(r.key, e.target.checked)}
                disabled={readOnly}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              주문완료
            </label>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onRemove(r.key)}
                aria-label="행 삭제"
                className="shrink-0 rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-red-600"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-600 transition hover:border-neutral-500 hover:bg-neutral-50"
        >
          <span aria-hidden>+</span>
          <span>추가</span>
        </button>
      )}
    </div>
  );
}
