"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserMaster } from "@/lib/org/current";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // I/O/0/1 제외 (가독성)
const INVITE_LENGTH = 6;
const INVITE_TTL_DAYS = 7;

function generateInviteCode(): string {
  const bytes = new Uint8Array(INVITE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < INVITE_LENGTH; i++) {
    code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  return code;
}

// ─────────────── 멤버 ───────────────

export type Member = {
  user_id: string;
  role: "master" | "member";
  joined_at: string;
  email: string;
  display_name: string | null;
};

export async function getMembers(orgId: string): Promise<Member[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // 본인이 멤버여야 함 (RLS도 막지만 명시적으로)
  const { data: meRow } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!meRow) return [];

  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id, role, joined_at")
    .eq("organization_id", orgId)
    .order("joined_at", { ascending: true });

  if (error || !data) return [];

  // profile 조회로 이름/이메일 join (RLS: 본인 외 profile은 select 정책상 안 보임)
  // → 마스터/멤버 화면에 다른 멤버 정보 보이게 하려면 RPC가 필요하지만,
  //   우선 본인+자신이 아는 정보만 표기. (개선 여지: 0012에 read_org_members RPC 추가)
  const userIds = data.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", userIds);

  const byId = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      { email: p.email as string, display_name: p.display_name as string | null },
    ]),
  );

  return data.map((m) => {
    const p = byId.get(m.user_id);
    return {
      user_id: m.user_id,
      role: m.role as "master" | "member",
      joined_at: m.joined_at as string,
      email: p?.email ?? "(이름 비공개)",
      display_name: p?.display_name ?? null,
    };
  });
}

export async function removeMember(orgId: string, targetUserId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  if (!(await isCurrentUserMaster(orgId))) {
    return { error: "마스터만 멤버를 제거할 수 있습니다" };
  }
  if (targetUserId === user.id) {
    return { error: "본인은 제거할 수 없습니다" };
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", orgId)
    .eq("user_id", targetUserId);

  if (error) return { error: error.message };

  revalidatePath("/settings/members");
  return { ok: true };
}

// ─────────────── 초대 코드 ───────────────

export type Invitation = {
  id: string;
  code: string;
  expires_at: string;
  created_at: string;
};

export async function getInvitations(orgId: string): Promise<Invitation[]> {
  const supabase = createClient();
  if (!(await isCurrentUserMaster(orgId))) return [];

  const { data, error } = await supabase
    .from("organization_invitations")
    .select("id, code, expires_at, created_at")
    .eq("organization_id", orgId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Invitation[];
}

export async function createInvitation(orgId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  if (!(await isCurrentUserMaster(orgId))) {
    return { error: "마스터만 초대 코드를 만들 수 있습니다" };
  }

  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // 코드 충돌(23505) 시 재시도 — 32^6 ≈ 10억으로 충돌 가능성 매우 낮음
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const { data, error } = await supabase
      .from("organization_invitations")
      .insert({
        organization_id: orgId,
        code,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select("id, code, expires_at, created_at")
      .single();

    if (!error) {
      revalidatePath("/settings/members");
      return { ok: true, invitation: data as Invitation };
    }
    if (error.code !== "23505") {
      return { error: error.message };
    }
  }
  return { error: "초대 코드 생성에 실패했습니다. 잠시 후 다시 시도하세요." };
}

export async function revokeInvitation(invitationId: string, orgId: string) {
  const supabase = createClient();
  if (!(await isCurrentUserMaster(orgId))) {
    return { error: "마스터만 초대 코드를 폐기할 수 있습니다" };
  }

  const { error } = await supabase
    .from("organization_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/settings/members");
  return { ok: true };
}
