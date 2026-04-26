"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  clearCurrentOrgCookie,
  getCurrentOrgId,
  isCurrentUserMaster,
  setCurrentOrgCookie,
} from "@/lib/org/current";

// ─────────────── 조회 ───────────────

export type MyOrganization = {
  id: string;
  name: string;
  role: "master" | "member";
};

export async function getMyOrganizations(): Promise<MyOrganization[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organization:organizations(id, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  if (error) return [];

  return (data ?? [])
    .map((r) => {
      const raw = r as unknown as {
        role: "master" | "member";
        organization:
          | { id: string; name: string }
          | { id: string; name: string }[]
          | null;
      };
      const org = Array.isArray(raw.organization)
        ? raw.organization[0]
        : raw.organization;
      if (!org) return null;
      return { id: org.id, name: org.name, role: raw.role };
    })
    .filter((x): x is MyOrganization => !!x);
}

// ─────────────── 전환 ───────────────

export async function switchOrg(orgId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  // 멤버십 검증
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return { error: "가입되지 않은 기업입니다" };

  setCurrentOrgCookie(orgId);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ─────────────── 생성 ───────────────

const createSchema = z.object({
  name: z.string().trim().min(1, "기업 이름을 입력하세요").max(50),
});

export async function createOrg(input: z.input<typeof createSchema>) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  // RPC: org 생성 + 마스터 등록을 원자적으로 (RLS chicken-and-egg 우회)
  const { data, error } = await supabase.rpc("create_organization", {
    org_name: parsed.data.name,
  });
  if (error) return { error: error.message };
  const newOrgId = data as string;

  setCurrentOrgCookie(newOrgId);
  revalidatePath("/", "layout");
  return { ok: true, id: newOrgId };
}

// ─────────────── 초대 코드 참여 ───────────────

const joinSchema = z.object({
  code: z.string().trim().min(1, "초대 코드를 입력하세요").max(20),
});

export async function joinByCode(input: z.input<typeof joinSchema>) {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const { data, error } = await supabase.rpc("accept_invitation", {
    invite_code: parsed.data.code,
  });
  if (error) return { error: error.message };
  const orgId = data as string;

  setCurrentOrgCookie(orgId);
  revalidatePath("/", "layout");
  return { ok: true, id: orgId };
}

// ─────────────── 탈퇴 ───────────────

export async function leaveOrg(orgId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  // 마스터는 단독으로 탈퇴 불가 (다른 마스터에게 위임 또는 org 삭제부터)
  if (await isCurrentUserMaster(orgId)) {
    return {
      error:
        "마스터는 탈퇴할 수 없습니다. 기업을 삭제하거나 다른 멤버에게 마스터를 위임하세요.",
    };
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", orgId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  // 현재 선택된 org였다면 쿠키 클리어
  const current = await getCurrentOrgId();
  if (current === orgId) clearCurrentOrgCookie();

  revalidatePath("/", "layout");
  return { ok: true };
}

// ─────────────── 삭제 (마스터 전용, 모든 데이터 cascade) ───────────────

export async function deleteOrg(orgId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  if (!(await isCurrentUserMaster(orgId))) {
    return { error: "마스터만 기업을 삭제할 수 있습니다" };
  }

  // FK on delete cascade가 brands/stores/visits/members/invitations를 모두 정리
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", orgId);
  if (error) return { error: error.message };

  // 쿠키 클리어 (다른 org가 있어도 명시적으로 다시 선택하게 유도)
  const current = await getCurrentOrgId();
  if (current === orgId) clearCurrentOrgCookie();

  revalidatePath("/", "layout");
  return { ok: true };
}

// ─────────────── 라우팅 헬퍼 ───────────────

// /organizations에서 선택 후 홈으로 라우팅하기 위한 wrapper
export async function switchOrgAndRedirect(orgId: string) {
  const res = await switchOrg(orgId);
  if (res.error) return res;
  redirect("/");
}
