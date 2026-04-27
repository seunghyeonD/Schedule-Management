import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const CURRENT_ORG_COOKIE = "current_org_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년

// React cache로 요청당 1회만 실제 DB 호출. SSR에서 같은 페이지의 여러 쿼리가
// 중복으로 auth + 멤버십 체크를 돌리지 않도록 함.
export const getCurrentOrgId = cache(async (): Promise<string | null> => {
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
});

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

// 현재 유저가 해당 org의 마스터인지 — 요청당 1회 캐시
export const isCurrentUserMaster = cache(
  async (orgId: string): Promise<boolean> => {
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
  },
);
