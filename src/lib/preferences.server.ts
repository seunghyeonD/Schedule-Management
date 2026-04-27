import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isFontSize, type FontSize } from "@/lib/preferences";

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
