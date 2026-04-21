"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const addVisitSchema = z.object({
  store_id: z.string().uuid(),
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식 오류"),
});

export async function addVisit(input: z.input<typeof addVisitSchema>) {
  const parsed = addVisitSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  // 해당 날짜의 기존 방문 수를 세서 visit_order 자동 부여
  const { count } = await supabase
    .from("visits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("visit_date", parsed.data.visit_date);

  const nextOrder = (count ?? 0) + 1;

  const { error } = await supabase.from("visits").insert({
    user_id: user.id,
    store_id: parsed.data.store_id,
    visit_date: parsed.data.visit_date,
    visit_order: nextOrder,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { ok: true };
}

export async function deleteVisit(visitId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  // 삭제할 visit의 date와 order를 먼저 조회
  const { data: target } = await supabase
    .from("visits")
    .select("visit_date, visit_order")
    .eq("id", visitId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("visits")
    .delete()
    .eq("id", visitId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  // 같은 날짜에서 삭제된 visit보다 뒤에 있는 항목들의 순번을 하나씩 당김
  if (target) {
    const { data: rest } = await supabase
      .from("visits")
      .select("id, visit_order")
      .eq("user_id", user.id)
      .eq("visit_date", target.visit_date)
      .gt("visit_order", target.visit_order);

    if (rest && rest.length > 0) {
      await Promise.all(
        rest.map((v) =>
          supabase
            .from("visits")
            .update({ visit_order: v.visit_order - 1 })
            .eq("id", v.id),
        ),
      );
    }
  }

  revalidatePath("/");
  return { ok: true };
}

export async function reorderVisit(
  visitId: string,
  direction: "up" | "down",
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { data: target } = await supabase
    .from("visits")
    .select("id, visit_date, visit_order")
    .eq("id", visitId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!target) return { error: "방문 기록 없음" };

  const neighborOrder =
    direction === "up" ? target.visit_order - 1 : target.visit_order + 1;
  if (neighborOrder < 1) return { ok: true };

  const { data: neighbor } = await supabase
    .from("visits")
    .select("id")
    .eq("user_id", user.id)
    .eq("visit_date", target.visit_date)
    .eq("visit_order", neighborOrder)
    .maybeSingle();

  if (!neighbor) return { ok: true };

  // swap
  await supabase
    .from("visits")
    .update({ visit_order: -1 })
    .eq("id", target.id);
  await supabase
    .from("visits")
    .update({ visit_order: target.visit_order })
    .eq("id", neighbor.id);
  await supabase
    .from("visits")
    .update({ visit_order: neighborOrder })
    .eq("id", target.id);

  revalidatePath("/");
  return { ok: true };
}
