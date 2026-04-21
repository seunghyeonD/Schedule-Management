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

  // 로그인돼 있는데 아직 동의 안 했으면 consent 페이지로
  // (consent/terms/privacy 자체는 예외)
  if (user && !isConsentPage && !isTermsPage && !isPrivacyPage) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("terms_agreed_at, privacy_agreed_at")
      .eq("id", user.id)
      .maybeSingle();

    // 0008 마이그레이션 전이면 컬럼 없음 → 리디렉트 없이 통과 (앱이 안 깨지게)
    if (!error && (!profile?.terms_agreed_at || !profile?.privacy_agreed_at)) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding/consent";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
