"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  ensureBrandSheetTab,
  removeBrandSheetTab,
} from "@/app/actions/sheets";
import { getCurrentOrgId } from "@/lib/org/current";

const brandSchema = z.object({
  name: z.string().trim().min(1, "브랜드명을 입력하세요").max(50),
});

export async function createBrand(formData: FormData) {
  const parsed = brandSchema.safeParse({ name: formData.get("name") });
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

  const { error } = await supabase.from("brands").insert({
    name: parsed.data.name,
    created_by: user.id,
    organization_id: orgId,
  });

  if (error) {
    if (error.code === "23505") return { error: "이미 등록된 브랜드입니다" };
    return { error: error.message };
  }

  // 연결된 스프레드시트가 있으면 해당 브랜드 탭을 만들어 둠 (실패해도 브랜드 생성은 OK)
  await ensureBrandSheetTab(parsed.data.name);

  revalidatePath("/stores");
  return { ok: true };
}

export async function deleteBrand(brandId: string) {
  const supabase = createClient();

  // 매장이 하나라도 남아있으면 삭제 불가 (soft-delete된 매장 포함 — 시트 히스토리 보호)
  const { count, error: cErr } = await supabase
    .from("stores")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId);
  if (cErr) return { error: cErr.message };
  if (count && count > 0) {
    return {
      error:
        "이 브랜드에 등록된 매장이 있어 삭제할 수 없습니다. 매장을 먼저 정리하세요.",
    };
  }

  // 브랜드명 먼저 조회 (시트 탭 제거용)
  const { data: brand } = await supabase
    .from("brands")
    .select("name")
    .eq("id", brandId)
    .maybeSingle();

  const { error } = await supabase.from("brands").delete().eq("id", brandId);
  if (error) return { error: error.message };

  // 앱이 만든 스프레드시트라면 해당 브랜드 탭도 정리 (실패해도 삭제는 OK)
  if (brand?.name) {
    await removeBrandSheetTab(brand.name);
  }

  revalidatePath("/stores");
  return { ok: true };
}

const storeSchema = z.object({
  brand_id: z.string().uuid("브랜드를 선택하세요"),
  name: z.string().trim().min(1, "매장명을 입력하세요").max(100),
  address: z.string().trim().min(1, "주소를 입력하세요"),
  address_detail: z.string().trim().optional().nullable(),
  postal_code: z.string().trim().optional().nullable(),
  sido: z.string().trim().optional().nullable(),
  sigungu: z.string().trim().optional().nullable(),
  region_group_id: z.string().uuid().optional().nullable(),
});

export async function createStore(input: z.input<typeof storeSchema>) {
  const parsed = storeSchema.safeParse(input);
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

  // 지역그룹이 제공되지 않았으면 sido+sigungu로 조회
  let regionGroupId = parsed.data.region_group_id ?? null;
  if (!regionGroupId && parsed.data.sido && parsed.data.sigungu) {
    const { data: mapping } = await supabase
      .from("region_mappings")
      .select("region_group_id")
      .eq("sido", parsed.data.sido)
      .eq("sigungu", parsed.data.sigungu)
      .maybeSingle();
    regionGroupId = mapping?.region_group_id ?? null;
  }

  const { error } = await supabase.from("stores").insert({
    brand_id: parsed.data.brand_id,
    name: parsed.data.name,
    address: parsed.data.address,
    address_detail: parsed.data.address_detail ?? null,
    postal_code: parsed.data.postal_code ?? null,
    sido: parsed.data.sido ?? null,
    sigungu: parsed.data.sigungu ?? null,
    region_group_id: regionGroupId,
    created_by: user.id,
    organization_id: orgId,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "이미 동일 브랜드에 같은 이름의 매장이 있습니다" };
    return { error: error.message };
  }

  revalidatePath("/stores");
  return { ok: true };
}

export async function deleteStore(storeId: string) {
  const supabase = createClient();

  // 방문 기록이 있으면 삭제 거부 (캘린더에서 먼저 지워달라는 안내)
  const { count } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  if (count && count > 0) {
    return {
      error:
        "캘린더에 방문기록이 있는 매장입니다. 방문기록을 지운 후 매장을 지워주세요",
    };
  }

  const { error } = await supabase.from("stores").delete().eq("id", storeId);
  if (error) return { error: error.message };

  revalidatePath("/stores");
  return { ok: true };
}

// 지역 매핑이 없을 때 사용자가 선택한 그룹을 저장 (자동 학습)
export async function upsertRegionMapping(
  sido: string,
  sigungu: string,
  regionGroupId: string,
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("region_mappings")
    .upsert({ sido, sigungu, region_group_id: regionGroupId }, {
      onConflict: "sido,sigungu",
    });
  if (error) return { error: error.message };
  return { ok: true };
}
