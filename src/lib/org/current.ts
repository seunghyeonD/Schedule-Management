import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const CURRENT_ORG_COOKIE = "current_org_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년

// 현재 선택된 org id를 반환. 쿠키가 없거나 무효하면 첫 번째 가입 org로 자동 폴백.
// 가입된 org가 하나도 없으면 null.
export async function getCurrentOrgId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cookieStore = cookies();
  const cookieOrgId = cookieStore.get(CURRENT_ORG_COOKIE)?.value;

  if (cookieOrgId) {
    // 쿠키 값 검증: 이 유저가 정말 그 org 멤버인지
    const { data } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", cookieOrgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) return cookieOrgId;
  }

  // 폴백: 가장 먼저 가입한 org
  const { data: firstOrg } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return firstOrg?.organization_id ?? null;
}

// 쿠키만 세팅 (호출하는 server action이 멤버십을 사전 검증할 책임 있음)
export function setCurrentOrgCookie(orgId: string) {
  cookies().set(CURRENT_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearCurrentOrgCookie() {
  cookies().delete(CURRENT_ORG_COOKIE);
}

// 현재 유저가 해당 org의 마스터인지
export async function isCurrentUserMaster(orgId: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.role === "master";
}
