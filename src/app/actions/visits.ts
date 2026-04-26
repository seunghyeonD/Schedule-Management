"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org/current";

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

  const orgId = await getCurrentOrgId();
  if (!orgId) return { error: "기업이 선택되지 않았습니다" };

  // 같은 날짜에 같은 유저의 기존 방문 수를 세서 visit_order 자동 부여
  // (visit_order는 멤버 개인 단위로 카운트)
  const { count } = await supabase
    .from("visits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .eq("visit_date", parsed.data.visit_date);

  const nextOrder = (count ?? 0) + 1;

  const { error } = await supabase.from("visits").insert({
    user_id: user.id,
    organization_id: orgId,
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
    .select("visit_date, visit_order, organization_id")
    .eq("id", visitId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("visits")
    .delete()
    .eq("id", visitId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  // 같은 (user, org, 날짜)에서 삭제된 visit보다 뒤에 있는 항목들의 순번을 하나씩 당김
  if (target) {
    const { data: rest } = await supabase
      .from("visits")
      .select("id, visit_order")
      .eq("user_id", user.id)
      .eq("organization_id", target.organization_id)
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

const memoSchema = z.object({
  visit_id: z.string().uuid(),
  store_position: z.string().max(200).nullable(),
  customer_count: z.string().max(50).nullable(),
  sales_trend: z.string().max(500).nullable(),
  activity: z.string().max(2000).nullable(),
  display_type: z.string().max(200).nullable(),
  photo_paths: z.array(z.string().max(500)).max(10),
});

export async function updateVisitMemo(input: z.input<typeof memoSchema>) {
  const parsed = memoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  // photo_paths의 모든 경로가 본인 폴더({user_id}/{visit_id}/...) 소속인지 검증
  // Storage RLS가 읽기는 막지만, 임의 경로를 DB에 저장하지 못하도록 입력 단계에서 차단
  const expectedPrefix = `${user.id}/${parsed.data.visit_id}/`;
  for (const path of parsed.data.photo_paths) {
    if (!path.startsWith(expectedPrefix)) {
      return { error: "사진 경로가 올바르지 않습니다" };
    }
  }

  const { error } = await supabase
    .from("visits")
    .update({
      store_position: parsed.data.store_position,
      customer_count: parsed.data.customer_count,
      sales_trend: parsed.data.sales_trend,
      activity: parsed.data.activity,
      display_type: parsed.data.display_type,
      photo_paths: parsed.data.photo_paths,
    })
    .eq("id", parsed.data.visit_id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { ok: true };
}

// 모달에서 사진 제거 시 Storage에서도 지움 (DB의 photo_paths 업데이트는 저장 시 일괄 반영)
export async function removeVisitPhoto(path: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  // 본인 폴더가 아니면 거부 (Storage RLS가 재차 검증)
  if (!path.startsWith(`${user.id}/`)) {
    return { error: "권한이 없습니다" };
  }

  const { error } = await supabase.storage.from("visit-photos").remove([path]);
  if (error) return { error: error.message };
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
    .select("id, visit_date, visit_order, organization_id")
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
    .eq("organization_id", target.organization_id)
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
