"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { VisitCell } from "@/lib/supabase/calendar-queries";
import { createClient } from "@/lib/supabase/client";
import {
  removeVisitPhoto,
  updateVisitMemo,
} from "@/app/actions/visits";

type Props = {
  visit: VisitCell;
  currentUserId: string | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function VisitMemoModal({
  visit,
  currentUserId,
  onClose,
  onSaved,
}: Props) {
  // 본인이 작성한 visit이 아닐 때 (마스터가 다른 멤버의 visit 열람) 읽기 전용 모드.
  const readOnly = !currentUserId || visit.user_id !== currentUserId;
  const recorderLabel = visit.recorder
    ? visit.recorder.display_name?.trim() || visit.recorder.email
    : null;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [storePosition, setStorePosition] = useState("");
  const [customerCount, setCustomerCount] = useState("");
  const [salesTrend, setSalesTrend] = useState("");
  const [activity, setActivity] = useState("");
  const [displayType, setDisplayType] = useState("");
  const [requests, setRequests] = useState("");
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [originalPaths, setOriginalPaths] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // 모달 열릴 때 DB에서 최신 데이터 직접 조회 → prop 캐시 문제 회피
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from("visits")
        .select(
          "store_position, customer_count, sales_trend, activity, display_type, requests, photo_paths",
        )
        .eq("id", visit.id)
        .maybeSingle();

      if (fetchErr) {
        setError(`메모 조회 실패: ${fetchErr.message}`);
        setLoading(false);
        return;
      }

      const row = (data ?? {}) as {
        store_position?: string | null;
        customer_count?: string | null;
        sales_trend?: string | null;
        activity?: string | null;
        display_type?: string | null;
        requests?: string | null;
        photo_paths?: string[] | null;
      };
      setStorePosition(row.store_position ?? "");
      setCustomerCount(row.customer_count ?? "");
      setSalesTrend(row.sales_trend ?? "");
      setActivity(row.activity ?? "");
      setDisplayType(row.display_type ?? "");
      setRequests(row.requests ?? "");
      const paths = row.photo_paths ?? [];
      setPhotoPaths(paths);
      setOriginalPaths(paths);

      // signed URL 발급
      if (paths.length > 0) {
        const { data: urlData } = await supabase.storage
          .from("visit-photos")
          .createSignedUrls(paths, 60 * 60);
        const map: Record<string, string> = {};
        for (const item of urlData ?? []) {
          if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
        }
        setPhotoUrls(map);
      } else {
        setPhotoUrls({});
      }
      setLoading(false);
    })();
  }, [visit.id]);

  // ESC로 닫기 (orphan 정리 포함)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoPaths, originalPaths]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // 같은 파일 재선택 가능하게
    if (files.length === 0) return;
    if (photoPaths.length + files.length > 10) {
      setError("사진은 최대 10장까지 등록할 수 있습니다.");
      return;
    }

    // 파일 검증: 이미지 MIME 타입 + 10MB 이하 + 안전한 확장자
    const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    for (const file of files) {
      if (!ALLOWED_MIME.includes(file.type)) {
        setError(`이미지만 업로드 가능합니다 (jpg, png, webp, heic). 거부: ${file.name}`);
        return;
      }
      if (file.size > MAX_SIZE) {
        setError(`파일 크기는 10MB 이하만 가능합니다: ${file.name}`);
        return;
      }
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
      const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
      // 확장자 화이트리스트 (파일명 신뢰하지 않음)
      const ext = ALLOWED_EXT.includes(rawExt) ? rawExt : "jpg";
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

  // ✕ 버튼: 로컬 상태에서만 제거 — 저장 누르기 전까지는 DB/Storage에 반영 안 됨
  function handleRemovePhoto(path: string) {
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
        requests: requests.trim() || null,
        photo_paths: photoPaths,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }

      // DB 업데이트 성공 → 원본에 있었는데 지금은 빠진 경로만 Storage에서 삭제
      const toDelete = originalPaths.filter((p) => !photoPaths.includes(p));
      for (const path of toDelete) {
        await removeVisitPhoto(path);
      }

      onSaved?.();
      router.refresh();
      onClose();
    });
  }

  // 취소/X 닫기: 새로 업로드만 하고 저장 안 한 사진은 Storage에서 정리 (orphan 방지)
  async function handleClose() {
    const orphans = photoPaths.filter((p) => !originalPaths.includes(p));
    for (const path of orphans) {
      await removeVisitPhoto(path);
    }
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4 sm:py-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[95vh] sm:max-w-lg sm:rounded-xl"
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-neutral-900">
              {visit.store?.name ?? "방문"} 메모
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
              {recorderLabel && (
                <span className="ml-1 text-neutral-400">· {recorderLabel}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="닫기"
            className="text-neutral-500 hover:text-neutral-900"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loading && (
            <p className="text-center text-xs text-neutral-400">
              기존 메모 불러오는 중…
            </p>
          )}
          <Field label="상권 동향">
            <input
              value={storePosition}
              onChange={(e) => setStorePosition(e.target.value)}
              placeholder="예: 유동인구 증가, 경쟁사 신규 입점"
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="고객 동향">
              <input
                value={customerCount}
                onChange={(e) => setCustomerCount(e.target.value)}
                placeholder="예: 가족 단위 증가, 평일 한산"
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </Field>
            <Field label="진열 위치 및 동향">
              <input
                value={displayType}
                onChange={(e) => setDisplayType(e.target.value)}
                placeholder="예: 1층 정문 우측 엔드 2단"
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </Field>
          </div>

          <Field label="판매 동향">
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

          <Field label="요청사항">
            <textarea
              value={requests}
              onChange={(e) => setRequests(e.target.value)}
              rows={3}
              placeholder="점주/매니저로부터 받은 요청을 기록하세요"
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
            onClick={handleClose}
            className="rounded-md border border-neutral-300 bg-white px-4 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || uploading || loading}
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

