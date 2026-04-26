import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org/current";
import type { Brand, RegionGroup, Store } from "@/lib/types/db";

export async function getBrands(): Promise<Brand[]> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getRegionGroups(): Promise<RegionGroup[]> {
  // region_groups은 전역 마스터 데이터 (org 무관)
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
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select(
      "*, brand:brands(id, name), region_group:region_groups(id, name)",
    )
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StoreWithRelations[];
}
