// 브랜드 ID를 기반으로 결정적인 색상 선택
// Tailwind가 dynamic class를 못 tree-shake 하므로 고정 팔레트에서 선택
const PALETTE = [
  { dot: "bg-rose-500",    soft: "bg-rose-50    text-rose-700    border-rose-200" },
  { dot: "bg-amber-500",   soft: "bg-amber-50   text-amber-800   border-amber-200" },
  { dot: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { dot: "bg-sky-500",     soft: "bg-sky-50     text-sky-700     border-sky-200" },
  { dot: "bg-violet-500",  soft: "bg-violet-50  text-violet-700  border-violet-200" },
  { dot: "bg-pink-500",    soft: "bg-pink-50    text-pink-700    border-pink-200" },
  { dot: "bg-teal-500",    soft: "bg-teal-50    text-teal-700    border-teal-200" },
  { dot: "bg-orange-500",  soft: "bg-orange-50  text-orange-700  border-orange-200" },
] as const;

export function brandColor(brandId: string | null | undefined) {
  if (!brandId) return { dot: "bg-neutral-400", soft: "bg-neutral-50 text-neutral-600 border-neutral-200" };
  let hash = 0;
  for (let i = 0; i < brandId.length; i++) {
    hash = (hash * 31 + brandId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
