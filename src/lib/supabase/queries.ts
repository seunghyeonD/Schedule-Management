import { createClient } from "@/lib/supabase/server";
import type { Brand, RegionGroup, Store } from "@/lib/types/db";

export async function getBrands(): Promise<Brand[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getRegionGroups(): Promise<RegionGroup[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("region_groups")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export type StoreWithRelations = Store & {
  brand: { id: string; name: string } | null;
  region_group: { id: string; name: string } | null;
};

export async function getStores(): Promise<StoreWithRelations[]> {
  const supabase = createClient();
  // 0006 마이그레이션 안 돼 있을 수도 있으니 deleted_at 필터 실패 시 필터 없이 재시도
  const withFilter = await supabase
    .from("stores")
    .select(
      "*, brand:brands(id, name), region_group:region_groups(id, name)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!withFilter.error) {
    return (withFilter.data ?? []) as StoreWithRelations[];
  }

  console.warn(
    "[getStores] deleted_at 필터 실패 (0006 미실행?) — 전체 조회로 폴백:",
    withFilter.error.message,
  );
  const { data, error } = await supabase
    .from("stores")
    .select(
      "*, brand:brands(id, name), region_group:region_groups(id, name)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StoreWithRelations[];
}
