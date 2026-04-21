"use client";

import { formatDistanceToNow, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useCallback, useEffect, useRef, useState } from "react";
import { syncVisitsToSheets } from "@/app/actions/sheets";

type SyncState = "idle" | "syncing" | "pending" | "error";

type Props = {
  connected: boolean;
  initialLastSyncedAt: string | null;
  // markDirty를 부모에서 호출할 수 있도록 ref로 노출
  dirtyRef: React.MutableRefObject<(() => void) | null>;
};

const DEBOUNCE_MS = 2_000;

export function SyncButton({ connected, initialLastSyncedAt, dirtyRef }: Props) {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    initialLastSyncedAt,
  );
  const [state, setState] = useState<SyncState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSync = useCallback(async () => {
    setState("syncing");
    setError(null);
    const res = await syncVisitsToSheets();
    if (res.error) {
      setState("error");
      setError(res.error);
    } else {
      setLastSyncedAt(res.syncedAt ?? new Date().toISOString());
      setState("idle");
    }
  }, []);

  const markDirty = useCallback(() => {
    if (!connected) return;
    setState("pending");
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runSync();
    }, DEBOUNCE_MS);
  }, [connected, runSync]);

  // 부모가 markDirty를 호출할 수 있도록 ref에 주입
  useEffect(() => {
    dirtyRef.current = markDirty;
    return () => {
      dirtyRef.current = null;
    };
  }, [dirtyRef, markDirty]);

  // 상대시간 표시 주기적 갱신 (30초)
  useEffect(() => {
    const id = setInterval(() => forceTick((x) => x + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  function handleManualSync() {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    runSync();
  }

  if (!connected) {
    return (
      <a
        href="/settings"
        className="flex items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 4v16m8-8H4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Google Sheets 연결
      </a>
    );
  }

  const relative = lastSyncedAt
    ? formatDistanceToNow(parseISO(lastSyncedAt), {
        addSuffix: true,
        locale: ko,
      })
    : null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-neutral-500 sm:inline">
        {state === "syncing"
          ? "동기화 중…"
          : state === "pending"
            ? "변경 감지 · 곧 저장됩니다"
            : state === "error"
              ? `오류: ${error}`
              : relative
                ? `마지막 저장: ${relative}`
                : "아직 저장된 적 없음"}
      </span>
      <button
        onClick={handleManualSync}
        disabled={state === "syncing"}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
          state === "pending"
            ? "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400"
            : state === "error"
              ? "border-red-300 bg-red-50 text-red-700 hover:border-red-400"
              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
        }`}
      >
        <SheetIcon state={state} />
        {state === "syncing" ? "저장 중" : "Sheets 저장"}
      </button>
    </div>
  );
}

function SheetIcon({ state }: { state: SyncState }) {
  if (state === "syncing") {
    return (
      <svg
        className="animate-spin"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M4 9h16M10 3v18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
