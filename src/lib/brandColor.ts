// 브랜드별 표시 색상 — 캘린더/리스트의 dot, 카드 배경 등에서 사용.
// (1) 이름 매칭으로 고정 색상이 정의된 브랜드는 hex 값을 반환 → 호출부에서 inline style.
// (2) 그 외 브랜드는 ID 해시로 결정된 Tailwind 팔레트 클래스 사용.
// 차후 DB에 브랜드별 색상 컬럼이 추가되면 FIXED_BY_NAME을 그 값으로 대체하면 됨.

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

const FIXED_BY_NAME: Record<string, string> = {
  "이니스프리": "#A1E5A9",
  "아리따움": "#F7CDFF",
  "종합화장품": "#FCAF5A",
};

export type BrandColor = {
  dot: string;
  soft: string;
  hex: string | null;
};

export function brandColor(
  brandId: string | null | undefined,
  brandName?: string | null,
): BrandColor {
  const trimmedName = brandName?.trim();
  const fixedHex = trimmedName ? FIXED_BY_NAME[trimmedName] : undefined;
  if (fixedHex) {
    return { dot: "", soft: "", hex: fixedHex };
  }
  if (!brandId) {
    return {
      dot: "bg-neutral-400",
      soft: "bg-neutral-50 text-neutral-600 border-neutral-200",
      hex: null,
    };
  }
  let hash = 0;
  for (let i = 0; i < brandId.length; i++) {
    hash = (hash * 31 + brandId.charCodeAt(i)) | 0;
  }
  return { ...PALETTE[Math.abs(hash) % PALETTE.length], hex: null };
}

// 점/배경 등에 적용할 className/style을 한 번에 반환 — 호출부의 분기 정리용.
export function brandDotProps(c: BrandColor): {
  className: string;
  style?: { backgroundColor: string };
} {
  if (c.hex) return { className: "", style: { backgroundColor: c.hex } };
  return { className: c.dot };
}

// 브랜드명 chip(태그) 표시용. 고정 hex 브랜드는 inline style로 배경 + 어두운 텍스트,
// 그 외는 팔레트의 soft 클래스(연한 bg + 짙은 텍스트)로 fallback.
export function brandTagProps(c: BrandColor): {
  className: string;
  style?: { backgroundColor: string; color: string };
} {
  if (c.hex) {
    return {
      className: "",
      style: { backgroundColor: c.hex, color: "#1f2937" },
    };
  }
  return { className: c.soft };
}
