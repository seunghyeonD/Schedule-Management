import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

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

// 요청당 1회만 DB 호출 — 루트 layout과 settings 페이지 모두에서 안전하게 사용
export const getUserFontSize = cache(async (): Promise<FontSize> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "normal";

  const { data } = await supabase
    .from("profiles")
    .select("font_size")
    .eq("id", user.id)
    .maybeSingle();

  const v = data?.font_size;
  return isFontSize(v) ? v : "normal";
});
