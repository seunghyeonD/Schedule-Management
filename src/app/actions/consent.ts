"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveConsent() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ terms_agreed_at: now, privacy_agreed_at: now })
    .eq("id", user.id);

  if (error) {
    // 0008 마이그레이션 안 돌려졌으면 컬럼 없음 → 안내
    return {
      error:
        "동의 정보를 저장할 수 없습니다. 0008_consent_fields.sql 마이그레이션을 먼저 실행해 주세요. (" +
        error.message +
        ")",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
