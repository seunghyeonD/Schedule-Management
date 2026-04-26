import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/auth");
  const isLoginPage = pathname === "/login";
  const isTermsPage = pathname === "/terms";
  const isPrivacyPage = pathname === "/privacy";
  const isConsentPage = pathname === "/onboarding/consent";
  const isOrgsPage = pathname === "/organizations";
  const isPublic = isAuthRoute || isLoginPage || isTermsPage || isPrivacyPage;

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // 동의 미완료 시 consent로 (consent/terms/privacy/orgs 페이지 자체는 통과)
  if (
    user &&
    !isConsentPage &&
    !isTermsPage &&
    !isPrivacyPage &&
    !isOrgsPage
  ) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("terms_agreed_at, privacy_agreed_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && (!profile?.terms_agreed_at || !profile?.privacy_agreed_at)) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding/consent";
      return NextResponse.redirect(url);
    }
  }

  // 동의 완료 + org 선택/가입 안 됐으면 /organizations로
  // (consent/terms/privacy/orgs 자체는 예외)
  if (
    user &&
    !isConsentPage &&
    !isTermsPage &&
    !isPrivacyPage &&
    !isOrgsPage
  ) {
    const cookieOrgId = request.cookies.get("current_org_id")?.value;

    let validOrgId: string | null = null;
    if (cookieOrgId) {
      const { data } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("organization_id", cookieOrgId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) validOrgId = cookieOrgId;
    }

    if (!validOrgId) {
      // 쿠키 없거나 무효 → 가입된 첫 org로 자동 선택, 없으면 /organizations
      const { data: firstOrg } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstOrg) {
        // 자동 선택 후 통과
        response.cookies.set("current_org_id", firstOrg.organization_id, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
        });
      } else {
        const url = request.nextUrl.clone();
        url.pathname = "/organizations";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
