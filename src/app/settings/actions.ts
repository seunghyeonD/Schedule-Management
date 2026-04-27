"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const fontSizeSchema = z.enum(["small", "normal", "large", "xlarge"]);

export async function updateFontSize(value: string) {
  const parsed = fontSizeSchema.safeParse(value);
  if (!parsed.success) return { error: "잘못된 값" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("profiles")
    .update({ font_size: parsed.data })
    .eq("id", user.id);

  if (error) return { error: error.message };

  // 루트 layout에서 html font-size를 적용하므로 layout 단위 재검증
  revalidatePath("/", "layout");
  return { ok: true };
}
