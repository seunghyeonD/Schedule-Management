"use client";

import { useEffect, useState, useTransition } from "react";
import type { Brand, RegionGroup } from "@/lib/types/db";
import type { StoreWithRelations } from "@/lib/supabase/queries";
import { removeStorePhoto, updateStore } from "@/app/stores/actions";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PHOTOS = 10;

type Props = {
  store: StoreWithRelations;
  brands: Brand[];
  regionGroups: RegionGroup[];
  orgId: string | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function StoreEditModal({
  store,
  brands,
  regionGroups,
  orgId,
  onClose,
  onSaved,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [brandId, setBrandId] = useState<string>(store.brand_id);
  const [name, setName] = useState<string>(store.name);
  const [address, setAddress] = useState<string>(store.address ?? "");
  const [addressDetail, setAddressDetail] = useState<string>(
    store.address_detail ?? "",
  );
  const [sido, setSido] = useState<string>(store.sido ?? "");
  const [sigungu, setSigungu] = useState<string>(store.sigungu ?? "");
  const [regionGroupId, setRegionGroupId] = useState<string>(
    store.region_group_id ?? "",
  );

  // photo_paths: 모달 내 현재 상태 (저장 시 DB로 반영)
  // 마이그레이션 미적용 시 undefined일 수 있어 fallback
  const [photoPaths, setPhotoPaths] = useState<string[]>(
    store.photo_paths ?? [],
  );
  // 모달 오픈 시점 원본 — 변경 비교용
  const [originalPaths] = useState<string[]>(store.photo_paths ?? []);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [loadingUrls, setLoadingUrls] = useState(true);

  // 기존 사진 signed URL 발급
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      setLoadingUrls(true);
      if (originalPaths.length === 0) {
        setLoadingUrls(false);
        return;
      }
      const { data } = await supabase.storage
        .from("store-photos")
        .createSignedUrls(originalPaths, 60 * 60);
      const map: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      }
      setPhotoUrls(map);
      setLoadingUrls(false);
    })();
  }, [originalPaths]);

  // ESC로 닫기
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
    e.target.value = "";
    if (files.length === 0) return;
    if (photoPaths.length + files.length > MAX_PHOTOS) {
      setError(`사진은 최대 ${MAX_PHOTOS}장까지 첨부할 수 있습니다.`);
      return;
    }
    if (!orgId) {
      setError("기업이 선택되지 않았습니다");
      return;
    }
    for (const file of files) {
      if (!ALLOWED_MIME.includes(file.type)) {
        setError(`이미지만 첨부 가능합니다. 거부: ${file.name}`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`파일 크기는 10MB 이하여야 합니다: ${file.name}`);
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
      const ext = ALLOWED_EXT.includes(rawExt) ? rawExt : "jpg";
      const path = `${orgId}/${user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("store-photos")
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      newPaths.push(path);
    }

    if (newPaths.length > 0) {
      const { data } = await supabase.storage
        .from("store-photos")
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
      const res = await updateStore({
        store_id: store.id,
        brand_id: brandId,
        name,
        address,
        address_detail: addressDetail || null,
        postal_code: store.postal_code,
        sido: sido || null,
        sigungu: sigungu || null,
        region_group_id: regionGroupId || null,
        photo_paths: photoPaths,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }

      // DB 업데이트 성공 → 원본에 있었지만 지금은 빠진 경로 Storage에서 정리
      const toDelete = originalPaths.filter((p) => !photoPaths.includes(p));
      for (const path of toDelete) {
        await removeStorePhoto(path);
      }

      onSaved?.();
      onClose();
    });
  }

  // 취소: 새로 올렸지만 저장 안 한 사진을 Storage에서 정리 (orphan 방지)
  async function handleClose() {
    const orphans = photoPaths.filter((p) => !originalPaths.includes(p));
    for (const path of orphans) {
      await removeStorePhoto(path);
    }
    onClose();
  }

  const canSave = !isPending && !uploading && !!name && !!address && !!brandId;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4 sm:py-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[95vh] sm:max-w-xl sm:rounded-xl"
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h3 className="truncate text-sm font-semibold text-neutral-900">
            매장 수정
          </h3>
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
          <Field label="브랜드">
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="매장명">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </Field>

          <Field label="주소">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </Field>

          <Field label="상세 주소 (선택)">
            <input
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              placeholder="건물명/층/호수"
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </Field>

          <Field label="시/도">
            <input
              value={sido}
              onChange={(e) => setSido(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </Field>
          <Field label="시/군/구">
            <input
              value={sigungu}
              onChange={(e) => setSigungu(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </Field>
          <Field label="지역 그룹">
            <select
              value={regionGroupId}
              onChange={(e) => setRegionGroupId(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            >
              <option value="">- 선택 -</option>
              {regionGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`매장 사진 (${photoPaths.length}/${MAX_PHOTOS})`}>
            <div className="space-y-2">
              {loadingUrls && photoPaths.length > 0 && (
                <p className="text-[11px] text-neutral-400">
                  사진 불러오는 중…
                </p>
              )}
              {photoPaths.length > 0 && (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {photoPaths.map((path) => (
                    <li key={path} className="group relative">
                      {photoUrls[path] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoUrls[path]}
                          alt="매장 사진"
                          className="h-20 w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center rounded-md bg-neutral-100 text-[10px] text-neutral-400">
                          로드 중…
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(path)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="사진 제거"
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
                  disabled={uploading || photoPaths.length >= MAX_PHOTOS}
                  className="hidden"
                />
                {uploading
                  ? "업로드 중…"
                  : photoPaths.length >= MAX_PHOTOS
                    ? `최대 ${MAX_PHOTOS}장까지 첨부 가능`
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
            disabled={!canSave}
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
