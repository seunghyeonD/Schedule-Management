// 클라이언트/서버 양쪽에서 안전하게 쓰는 상수와 타입.
// (서버 전용 함수는 preferences.server.ts에 분리)

export type FontSize = "small" | "normal" | "large" | "xlarge";

export const FONT_SIZE_OPTIONS: {
  value: FontSize;
  label: string;
  px: string;
}[] = [
  { value: "small", label: "작게", px: "14px" },
  { value: "normal", label: "보통", px: "16px" },
  { value: "large", label: "크게", px: "18px" },
  { value: "xlarge", label: "매우 크게", px: "20px" },
];

export const FONT_SIZE_PX: Record<FontSize, string> = {
  small: "14px",
  normal: "16px",
  large: "18px",
  xlarge: "20px",
};

export function isFontSize(v: unknown): v is FontSize {
  return v === "small" || v === "normal" || v === "large" || v === "xlarge";
}
