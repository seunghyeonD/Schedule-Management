"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Brand, RegionGroup } from "@/lib/types/db";
import { createStore } from "@/app/stores/actions";
import { createClient } from "@/lib/supabase/client";
import { searchPlacesByKeyword, type KakaoPlace } from "@/app/actions/kakao";
import { parseSidoSigungu } from "@/lib/kakao/normalize";

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS = 10;

const DaumPostcodeEmbed = dynamic(
  () => import("react-daum-postcode").then((m) => m.default),
  { ssr: false },
);

type PostcodeData = {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  sido: string;
  sigungu: string;
};

type SearchMode = "keyword" | "address";

type CreatedStore = {
  id: string;
  name: string;
  brand_id: string;
  region_group_id: string | null;
  sigungu: string | null;
};

type Props = {
  brands: Brand[];
  regionGroups: RegionGroup[];
  orgId: string | null;
  submitLabel?: string;
  submitFullWidth?: boolean;
  onCreated?: (store: CreatedStore) => void | Promise<void>;
};

type SelectedPhoto = { file: File; previewUrl: string };

export function StoreForm({
  brands,
  regionGroups,
  orgId,
  submitLabel = "매장 추가",
  submitFullWidth = false,
  onCreated,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [openPostcode, setOpenPostcode] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("keyword");
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [brandId, setBrandId] = useState<string>(brands[0]?.id ?? "");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [regionGroupId, setRegionGroupId] = useState<string>("");
  const [autoMatched, setAutoMatched] = useState(false);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);

  // 컴포넌트 언마운트 시 미리보기 URL 메모리 정리
  useEffect(() => {
    return () => {
      for (const p of photos) URL.revokeObjectURL(p.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 브랜드가 0개일 때 마운트되면 brandId가 ""로 잠겨버려서, 이후 브랜드 추가로
  // brands prop이 채워져도 select가 빈 값을 유지해 버튼이 disabled로 남음.
  // brands가 바뀌고 현재 brandId가 목록에 없으면 첫 브랜드로 보정.
  useEffect(() => {
    if (brands.length === 0) return;
    if (!brands.some((b) => b.id === brandId)) {
      setBrandId(brands[0].id);
    }
  }, [brands, brandId]);

  const regionGroupById = useMemo(
    () => new Map(regionGroups.map((g) => [g.id, g.name])),
    [regionGroups],
  );

  async function applyAddress(opts: {
    address: string;
    zonecode?: string;
    sido: string;
    sigungu: string;
    prefillStoreName?: string;
  }) {
    setPostalCode(opts.zonecode ?? "");
    setAddress(opts.address);
    setSido(opts.sido);
    setSigungu(opts.sigungu);
    if (opts.prefillStoreName && !name) setName(opts.prefillStoreName);
    setOpenPostcode(false);

    const supabase = createClient();

    // 1) 정확한 sido + sigungu 매칭
    const { data: exact } = await supabase
      .from("region_mappings")
      .select("region_group_id")
      .eq("sido", opts.sido)
      .eq("sigungu", opts.sigungu)
      .maybeSingle();

    let groupId = exact?.region_group_id ?? null;

    // 2) 실패 시 sido 단위 fallback (sigungu = '*') — 세종/광역시 누락분 대비
    if (!groupId) {
      const { data: wildcard } = await supabase
        .from("region_mappings")
        .select("region_group_id")
        .eq("sido", opts.sido)
        .eq("sigungu", "*")
        .maybeSingle();
      groupId = wildcard?.region_group_id ?? null;
    }

    if (groupId) {
      setRegionGroupId(groupId);
      setAutoMatched(true);
    } else {
      setRegionGroupId("");
      setAutoMatched(false);
    }
  }

  function handlePostcodeComplete(data: PostcodeData) {
    applyAddress({
      address: data.roadAddress || data.address,
      zonecode: data.zonecode,
      sido: data.sido,
      sigungu: data.sigungu,
    });
  }

  async function runKeywordSearch() {
    if (!keyword.trim()) return;
    setSearching(true);
    setSearchError(null);
    const res = await searchPlacesByKeyword(keyword);
    setSearching(false);
    if (!res.ok) {
      setSearchError(res.error);
      setResults([]);
      return;
    }
    setResults(res.documents);
    if (res.documents.length === 0) {
      setSearchError("검색 결과가 없습니다. 다른 키워드로 시도해 보세요.");
    }
  }

  function handlePickKakaoPlace(place: KakaoPlace) {
    const addressName = place.road_address_name || place.address_name;
    const { sido, sigungu } = parseSidoSigungu(place.address_name);
    applyAddress({
      address: addressName,
      sido,
      sigungu,
      prefillStoreName: place.place_name,
    });
  }

  function openModal() {
    setOpenPostcode(true);
    setSearchMode("keyword");
    setSearchError(null);
  }

  function reset() {
    setName("");
    setAddress("");
    setAddressDetail("");
    setPostalCode("");
    setSido("");
    setSigungu("");
    setRegionGroupId("");
    setAutoMatched(false);
    for (const p of photos) URL.revokeObjectURL(p.previewUrl);
    setPhotos([]);
  }

  function handleSelectPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    e.target.value = ""; // 같은 파일 재선택 가능하게
    if (newFiles.length === 0) return;
    if (photos.length + newFiles.length > MAX_PHOTOS) {
      setError(`사진은 최대 ${MAX_PHOTOS}장까지 첨부할 수 있습니다.`);
      return;
    }
    for (const file of newFiles) {
      if (!ALLOWED_MIME.includes(file.type)) {
        setError(`이미지만 첨부 가능합니다 (jpg, png, webp, heic). 거부: ${file.name}`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`파일 크기는 10MB 이하여야 합니다: ${file.name}`);
        return;
      }
    }
    setError(null);
    const added: SelectedPhoto[] = newFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...added]);
  }

  function handleRemovePhoto(idx: number) {
    setPhotos((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  // 매장 추가 시 호출 — 사진을 먼저 Storage에 올린 뒤 경로 배열 반환.
  // 실패하면 이미 올라간 사진들을 정리해 orphan을 남기지 않음.
  async function uploadPhotos(userId: string): Promise<string[]> {
    if (photos.length === 0 || !orgId) return [];
    const supabase = createClient();
    const uploaded: string[] = [];

    for (const { file } of photos) {
      const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
      const ext = ALLOWED_EXT.includes(rawExt) ? rawExt : "jpg";
      const path = `${orgId}/${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("store-photos")
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        if (uploaded.length > 0) {
          await supabase.storage.from("store-photos").remove(uploaded);
        }
        throw new Error(`사진 업로드 실패: ${upErr.message}`);
      }
      uploaded.push(path);
    }
    return uploaded;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      let uploadedPaths: string[] = [];
      try {
        if (photos.length > 0) {
          if (!orgId) {
            setError("기업이 선택되지 않았습니다");
            return;
          }
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            setError("로그인이 필요합니다");
            return;
          }
          uploadedPaths = await uploadPhotos(user.id);
        }

        const res = await createStore({
          brand_id: brandId,
          name,
          address,
          address_detail: addressDetail || null,
          postal_code: postalCode || null,
          sido: sido || null,
          sigungu: sigungu || null,
          region_group_id: regionGroupId || null,
          photo_paths: uploadedPaths,
        });

        if (res?.error) {
          // 매장 저장 실패 → 방금 올린 사진 정리
          if (uploadedPaths.length > 0) {
            const supabase = createClient();
            await supabase.storage
              .from("store-photos")
              .remove(uploadedPaths);
          }
          setError(res.error);
          return;
        }
        reset();
        if (res?.store) await onCreated?.(res.store);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  if (brands.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        먼저 브랜드를 하나 이상 등록하세요.
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        submitFullWidth
          ? "flex h-full min-h-0 flex-col"
          : "space-y-4"
      }
    >
      <div
        className={
          submitFullWidth
            ? "flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-5 py-4"
            : "contents"
        }
      >
      <div
        className={
          submitFullWidth
            ? "space-y-4"
            : "grid grid-cols-1 gap-4 md:grid-cols-2"
        }
      >
        <Field label="브랜드">
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
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
            placeholder="예: NC강남점"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <Field label="주소">
        <button
          type="button"
          onClick={openModal}
          className="flex w-full items-center justify-between rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-left text-sm hover:border-neutral-400"
        >
          <span className={address ? "text-neutral-900" : "text-neutral-400"}>
            {address || "클릭해서 상호명 또는 주소로 검색하세요"}
          </span>
          <span className="text-xs text-neutral-500">🔍 검색</span>
        </button>
      </Field>

      {openPostcode && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenPostcode(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:max-w-xl sm:rounded-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-neutral-900">
                주소 검색
              </h3>
              <button
                type="button"
                onClick={() => setOpenPostcode(false)}
                aria-label="닫기"
                className="text-neutral-500 hover:text-neutral-900"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-neutral-200 bg-neutral-50 text-sm">
              <button
                type="button"
                onClick={() => setSearchMode("keyword")}
                className={`flex-1 py-2 transition ${
                  searchMode === "keyword"
                    ? "border-b-2 border-neutral-900 font-semibold text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                상호명으로 검색
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("address")}
                className={`flex-1 py-2 transition ${
                  searchMode === "address"
                    ? "border-b-2 border-neutral-900 font-semibold text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                도로명·지번으로 검색
              </button>
            </div>

            {searchMode === "keyword" ? (
              <div className="flex flex-col overflow-hidden">
                <div className="flex gap-2 border-b border-neutral-200 px-4 py-3">
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        runKeywordSearch();
                      }
                    }}
                    placeholder="예: 뉴코아아울렛 산본점"
                    autoFocus
                    className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={runKeywordSearch}
                    disabled={searching || !keyword.trim()}
                    className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {searching ? "검색 중…" : "검색"}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {searchError && (
                    <p className="px-4 py-4 text-xs text-red-600">
                      {searchError}
                    </p>
                  )}
                  {results.length > 0 && (
                    <ul className="divide-y divide-neutral-100">
                      {results.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => handlePickKakaoPlace(p)}
                            className="block w-full px-4 py-3 text-left hover:bg-neutral-50"
                          >
                            <div className="text-sm font-medium text-neutral-900">
                              {p.place_name}
                            </div>
                            <div className="mt-0.5 text-xs text-neutral-600">
                              {p.road_address_name || p.address_name}
                            </div>
                            {p.category_name && (
                              <div className="mt-0.5 text-[11px] text-neutral-400">
                                {p.category_name}
                              </div>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!searching && !searchError && results.length === 0 && (
                    <p className="px-4 py-8 text-center text-xs text-neutral-400">
                      상호명(예: &ldquo;NC산본&rdquo;, &ldquo;뉴코아아울렛
                      산본점&rdquo;)으로 검색하세요
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <DaumPostcodeEmbed
                onComplete={handlePostcodeComplete}
                style={{ height: 500 }}
                autoClose={false}
              />
            )}
          </div>
        </div>
      )}

      <Field label="상세 주소 (선택)">
        <input
          value={addressDetail}
          onChange={(e) => setAddressDetail(e.target.value)}
          placeholder="건물명/층/호수"
          className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
      </Field>

      {(sido || sigungu) && (
        <div
          className={
            submitFullWidth
              ? "space-y-4"
              : "grid grid-cols-1 gap-4 md:grid-cols-3"
          }
        >
          <Field label="시/도">
            <input
              value={sido}
              readOnly
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-sm"
            />
          </Field>
          <Field label="시/군/구">
            <input
              value={sigungu}
              readOnly
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-sm"
            />
          </Field>
          <Field
            label={`지역 그룹${autoMatched ? " (자동 매칭)" : " (수동 선택 필요)"}`}
          >
            <select
              value={regionGroupId}
              onChange={(e) => {
                setRegionGroupId(e.target.value);
                setAutoMatched(false);
              }}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            >
              <option value="">- 선택 -</option>
              {regionGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {!autoMatched && regionGroupById.size > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                이 시/군/구에 매핑된 그룹이 없습니다. 선택하시면 다음부터 자동 매칭됩니다.
              </p>
            )}
          </Field>
        </div>
      )}

      <Field label={`매장 사진 (선택, ${photos.length}/${MAX_PHOTOS})`}>
        <div className="space-y-2">
          {photos.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((p, idx) => (
                <li key={p.previewUrl} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.previewUrl}
                    alt="매장 사진"
                    className="h-20 w-full rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    aria-label="사진 제거"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
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
              onChange={handleSelectPhotos}
              disabled={isPending || photos.length >= MAX_PHOTOS}
              className="hidden"
            />
            {photos.length >= MAX_PHOTOS
              ? `최대 ${MAX_PHOTOS}장까지 첨부 가능`
              : "＋ 사진 추가"}
          </label>
        </div>
      </Field>
      </div>

      {submitFullWidth ? (
        <div className="shrink-0 border-t border-neutral-100 bg-white px-5 py-3">
          {error && (
            <p className="mb-2 text-center text-xs text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={isPending || !name || !address || !brandId}
            className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "저장 중…" : submitLabel}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isPending || !name || !address || !brandId}
            className="ml-auto rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "저장 중…" : submitLabel}
          </button>
        </div>
      )}
    </form>
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
