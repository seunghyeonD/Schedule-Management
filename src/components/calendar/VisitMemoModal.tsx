"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useEffect, useState, useTransition } from "react";
import type { VisitCell } from "@/lib/supabase/calendar-queries";
import { createClient } from "@/lib/supabase/client";
import {
  removeVisitPhoto,
  updateVisitMemo,
} from "@/app/actions/visits";

type Props = {
  visit: VisitCell;
  onClose: () => void;
  onSaved?: () => void;
};

export function VisitMemoModal({ visit, onClose, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [storePosition, setStorePosition] = useState(visit.store_position ?? "");
  const [customerCount, setCustomerCount] = useState(visit.customer_count ?? "");
  const [salesTrend, setSalesTrend] = useState(visit.sales_trend ?? "");
  const [activity, setActivity] = useState(visit.activity ?? "");
  const [displayType, setDisplayType] = useState(visit.display_type ?? "");
  const [photoPaths, setPhotoPaths] = useState<string[]>(visit.photo_paths ?? []);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  // 기존 사진의 signed URL 로드
  useEffect(() => {
    if (photoPaths.length === 0) return;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.storage
        .from("visit-photos")
        .createSignedUrls(photoPaths, 60 * 60);
      const map: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      }
      setPhotoUrls(map);
    })();
    // 최초 렌더링 시점의 경로 기준 1회만 로드 (이후 업로드는 개별 처리)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // 같은 파일 재선택 가능하게
    if (files.length === 0) return;
    if (photoPaths.length + files.length > 10) {
      setError("사진은 최대 10장까지 등록할 수 있습니다.");
      return;
    }

    setError(null);
    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      setError("로그인이 필요합니다");
      return;
    }

    const newPaths: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${visit.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("visit-photos")
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      newPaths.push(path);
    }

    // 업로드된 파일 signed URL 발급
    if (newPaths.length > 0) {
      const { data } = await supabase.storage
        .from("visit-photos")
        .createSignedUrls(newPaths, 60 * 60);
      setPhotoUrls((prev) => {
        const next = { ...prev };
        for (const item of data ?? []) {
          if (item.path && item.signedUrl) next[item.path] = item.signedUrl;
        }
        return next;
      });
      setPhotoPaths((prev) => [...prev, ...newPaths]);
    }

    setUploading(false);
  }

  async function handleRemovePhoto(path: string) {
    if (!confirm("이 사진을 삭제할까요?")) return;
    const res = await removeVisitPhoto(path);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setPhotoPaths((prev) => prev.filter((p) => p !== path));
    setPhotoUrls((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateVisitMemo({
        visit_id: visit.id,
        store_position: storePosition.trim() || null,
        customer_count: customerCount.trim() || null,
        sales_trend: salesTrend.trim() || null,
        activity: activity.trim() || null,
        display_type: displayType.trim() || null,
        photo_paths: photoPaths,
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
        className="flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-neutral-900">
              {visit.store?.name ?? "방문"} 메모
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

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Field label="매장 입점 위치">
            <input
              value={storePosition}
              onChange={(e) => setStorePosition(e.target.value)}
              placeholder="예: 1층 정문 우측, 지하1층 에스컬레이터 옆"
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="유입 고객수">
              <input
                value={customerCount}
                onChange={(e) => setCustomerCount(e.target.value)}
                placeholder="예: 30명, 보통"
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </Field>
            <Field label="진열형태">
              <input
                value={displayType}
                onChange={(e) => setDisplayType(e.target.value)}
                placeholder="예: 엔드 2단, 평대 우측"
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </Field>
          </div>

          <Field label="판매동향">
            <input
              value={salesTrend}
              onChange={(e) => setSalesTrend(e.target.value)}
              placeholder="예: 전월 대비 상승"
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </Field>

          <Field label="활동사항">
            <textarea
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              rows={4}
              placeholder="오늘의 활동을 자유롭게 기록하세요"
              className="w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label={`사진 (${photoPaths.length}/10)`}>
            <div className="space-y-2">
              {photoPaths.length > 0 && (
                <ul className="grid grid-cols-3 gap-2">
                  {photoPaths.map((path) => (
                    <li key={path} className="group relative">
                      {photoUrls[path] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoUrls[path]}
                          alt="방문 사진"
                          className="h-24 w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-full items-center justify-center rounded-md bg-neutral-100 text-[11px] text-neutral-400">
                          로드 중…
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(path)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="사진 삭제"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-xs text-neutral-600 hover:border-neutral-400 hover:bg-neutral-100">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUpload}
                  disabled={uploading || photoPaths.length >= 10}
                  className="hidden"
                />
                {uploading
                  ? "업로드 중…"
                  : photoPaths.length >= 10
                    ? "최대 10장까지 첨부 가능"
                    : "＋ 사진 추가"}
              </label>
            </div>
          </Field>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
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
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || uploading}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "저장 중…" : "저장"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-600">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

