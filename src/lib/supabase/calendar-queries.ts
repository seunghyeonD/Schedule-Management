import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org/current";

export type VisitCell = {
  id: string;
  visit_date: string;
  visit_order: number;
  store_position: string | null;
  customer_count: string | null;
  sales_trend: string | null;
  activity: string | null;
  display_type: string | null;
  photo_paths: string[];
  store: {
    id: string;
    name: string;
    deleted_at: string | null;
    brand: { id: string; name: string } | null;
    region_group: { id: string; name: string } | null;
  } | null;
};

// 캘린더에는 본인의 방문만 표시 (팀 전체 보기는 별도 화면 — 추후)
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

  const { data, error } = await supabase
    .from("visits")
    .select(
      `id, visit_date, visit_order,
       store_position, customer_count, sales_trend, activity, display_type, photo_paths,
       store:stores(
         id, name, deleted_at,
         brand:brands(id, name),
         region_group:region_groups(id, name)
       )`,
    )
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .gte("visit_date", fromDate)
    .lte("visit_date", toDate)
    .order("visit_date")
    .order("visit_order");

  if (error) throw error;
  const rows = (data ?? []) as unknown as VisitCell[];
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
