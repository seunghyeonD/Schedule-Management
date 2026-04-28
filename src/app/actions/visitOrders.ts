"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org/current";

export type VisitOrderItem = {
  id: string;
  visit_id: string;
  kind: "order" | "return";
  product_name: string;
  quantity: number;
  sort_order: number;
};

export async function getVisitOrderItems(
  visitId: string,
): Promise<{ items?: VisitOrderItem[]; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("visit_order_items")
    .select("id, visit_id, kind, product_name, quantity, sort_order")
    .eq("visit_id", visitId)
    .order("kind", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) return { error: error.message };
  return { items: (data ?? []) as VisitOrderItem[] };
}

export async function getOrderItemsForVisits(
  visitIds: string[],
): Promise<{ items?: VisitOrderItem[]; error?: string }> {
  if (visitIds.length === 0) return { items: [] };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("visit_order_items")
    .select("id, visit_id, kind, product_name, quantity, sort_order")
    .in("visit_id", visitIds)
    .order("kind", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) return { error: error.message };
  return { items: (data ?? []) as VisitOrderItem[] };
}

const itemSchema = z.object({
  kind: z.enum(["order", "return"]),
  product_name: z.string().trim().min(1, "상품명을 입력하세요").max(200),
  quantity: z.number().int().min(0).max(1_000_000),
  sort_order: z.number().int().min(0).max(10_000),
});

const saveSchema = z.object({
  visit_id: z.string().uuid(),
  items: z.array(itemSchema).max(200),
});

// 단일 visit의 주문/반품 항목을 한 번에 교체 (replace-all 방식 — 행 단위 동기화 단순화)
export async function saveVisitOrderItems(
  input: z.input<typeof saveSchema>,
) {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력 오류" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const orgId = await getCurrentOrgId();
  if (!orgId) return { error: "기업이 선택되지 않았습니다" };

  // visit 소유권 확인 — 본인 visit 만 수정 가능
  const { data: visit } = await supabase
    .from("visits")
    .select("id, user_id, organization_id")
    .eq("id", parsed.data.visit_id)
    .maybeSingle();
  if (!visit || visit.user_id !== user.id) {
    return { error: "권한이 없습니다" };
  }
  if (visit.organization_id !== orgId) {
    return { error: "기업 정보가 일치하지 않습니다" };
  }

  // 기존 행 일괄 삭제 후 재삽입
  const { error: delErr } = await supabase
    .from("visit_order_items")
    .delete()
    .eq("visit_id", parsed.data.visit_id);
  if (delErr) return { error: delErr.message };

  if (parsed.data.items.length > 0) {
    const rows = parsed.data.items.map((it) => ({
      visit_id: parsed.data.visit_id,
      organization_id: orgId,
      kind: it.kind,
      product_name: it.product_name,
      quantity: it.quantity,
      sort_order: it.sort_order,
    }));
    const { error: insErr } = await supabase
      .from("visit_order_items")
      .insert(rows);
    if (insErr) return { error: insErr.message };
  }

  revalidatePath("/");
  return { ok: true };
}
