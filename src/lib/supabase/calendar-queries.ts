import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId, isCurrentUserMaster } from "@/lib/org/current";

export type VisitCell = {
  id: string;
  user_id: string;
  visit_date: string;
  visit_order: number;
  store_position: string | null;
  customer_count: string | null;
  sales_trend: string | null;
  activity: string | null;
  display_type: string | null;
  requests: string | null;
  photo_paths: string[];
  store: {
    id: string;
    name: string;
    deleted_at: string | null;
    brand: { id: string; name: string } | null;
    region_group: { id: string; name: string } | null;
  } | null;
  // 마스터 뷰일 때만 채워짐 — 멤버는 본인 것만 보이므로 null로 둠.
  recorder: { display_name: string | null; email: string } | null;
};

// 멤버: 본인의 방문만 표시.
// 마스터: org 전체 멤버의 방문 표시 (등록자 이름 같이 노출).
export async function getVisitsInRange(
  fromDate: string,
  toDate: string,
): Promise<VisitCell[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const orgId = await getCurrentOrgId();
  if (!orgId) return [];

  const isMaster = await isCurrentUserMaster(orgId);

  let query = supabase
    .from("visits")
    .select(
      `id, user_id, visit_date, visit_order,
       store_position, customer_count, sales_trend, activity, display_type, requests, photo_paths,
       store:stores(
         id, name, deleted_at,
         brand:brands(id, name),
         region_group:region_groups(id, name)
       )`,
    )
    .eq("organization_id", orgId)
    .gte("visit_date", fromDate)
    .lte("visit_date", toDate)
    .order("visit_date")
    .order("visit_order");

  if (!isMaster) query = query.eq("user_id", user.id);

  const { data, error } = await query;
  if (error) throw error;

  const baseRows = (data ?? []) as unknown as Omit<VisitCell, "recorder">[];

  // 마스터 뷰면 등록자 profile (display_name/email) join — 다른 멤버의 visits에 라벨 달기용.
  let recorderById = new Map<
    string,
    { display_name: string | null; email: string }
  >();
  if (isMaster && baseRows.length > 0) {
    const userIds = Array.from(new Set(baseRows.map((v) => v.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      recorderById.set(p.id as string, {
        display_name: (p.display_name as string | null) ?? null,
        email: p.email as string,
      });
    }
  }

  const rows: VisitCell[] = baseRows.map((v) => ({
    ...v,
    recorder: recorderById.get(v.user_id) ?? null,
  }));
  return rows.filter((v) => v.store && !v.store.deleted_at);
}

export type StorePicker = {
  id: string;
  name: string;
  sigungu: string | null;
  brand_id: string;
  region_group_id: string | null;
};

// 캘린더 선택 플로우용 — 현재 org의 매장만
export async function getStoresForPicker(): Promise<StorePicker[]> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, sigungu, brand_id, region_group_id")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("name");

  if (error) throw error;
  return (data ?? []) as StorePicker[];
}
