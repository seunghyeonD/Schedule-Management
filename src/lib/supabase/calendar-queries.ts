import { createClient } from "@/lib/supabase/server";

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

export async function getVisitsInRange(
  fromDate: string,
  toDate: string,
): Promise<VisitCell[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // 0006/0009 마이그레이션 안 돼 있을 수도 있으니 확장 컬럼 포함 쿼리 실패 시 폴백
  const fullSelect = `id, visit_date, visit_order,
       store_position, customer_count, sales_trend, activity, display_type, photo_paths,
       store:stores(
         id, name, deleted_at,
         brand:brands(id, name),
         region_group:region_groups(id, name)
       )`;

  const withAll = await supabase
    .from("visits")
    .select(fullSelect)
    .eq("user_id", user.id)
    .gte("visit_date", fromDate)
    .lte("visit_date", toDate)
    .order("visit_date")
    .order("visit_order");

  if (!withAll.error) {
    const rows = (withAll.data ?? []) as unknown as VisitCell[];
    return rows.filter((v) => v.store && !v.store.deleted_at);
  }

  console.warn(
    "[getVisitsInRange] 확장 컬럼 쿼리 실패 (0006/0009 미실행?) — 기본 쿼리로 폴백:",
    withAll.error.message,
  );
  const { data, error } = await supabase
    .from("visits")
    .select(
      `id, visit_date, visit_order,
       store:stores(
         id, name,
         brand:brands(id, name),
         region_group:region_groups(id, name)
       )`,
    )
    .eq("user_id", user.id)
    .gte("visit_date", fromDate)
    .lte("visit_date", toDate)
    .order("visit_date")
    .order("visit_order");

  if (error) throw error;
  // 메모 필드는 기본값으로 채움
  return (data ?? []).map((r) => ({
    ...(r as unknown as VisitCell),
    store_position: null,
    customer_count: null,
    sales_trend: null,
    activity: null,
    display_type: null,
    photo_paths: [],
  })) as unknown as VisitCell[];
}

export type StorePicker = {
  id: string;
  name: string;
  sigungu: string | null;
  brand_id: string;
  region_group_id: string | null;
};

// 캘린더 선택 플로우용 — 모든 매장을 한 번에 가져와서 클라이언트에서 필터링
// (soft-delete된 매장은 방문 추가 대상에서 제외)
export async function getStoresForPicker(): Promise<StorePicker[]> {
  const supabase = createClient();
  // 0006 마이그레이션 안 돼 있을 수도 있으니 deleted_at 필터 실패 시 필터 없이 재시도
  const withFilter = await supabase
    .from("stores")
    .select("id, name, sigungu, brand_id, region_group_id")
    .is("deleted_at", null)
    .order("name");

  if (!withFilter.error) {
    return (withFilter.data ?? []) as StorePicker[];
  }

  console.warn(
    "[getStoresForPicker] deleted_at 필터 실패 (0006 미실행?) — 전체 조회로 폴백:",
    withFilter.error.message,
  );
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, sigungu, brand_id, region_group_id")
    .order("name");
  if (error) throw error;
  return (data ?? []) as StorePicker[];
}
