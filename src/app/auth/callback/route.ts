import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 오픈 리다이렉트 방지: 같은 origin 내부로 향하는 상대 경로만 허용
function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  // 1) 반드시 "/"로 시작
  // 2) "//"로 시작하면 protocol-relative URL → 외부 도메인 가능, 거부
  // 3) "/\\"도 같은 위험
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.startsWith("/\\")) return "/";
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Google provider의 refresh_token이 있으면 profiles에 저장
      // (Supabase는 최초 로그인 때만 이 값을 노출하므로 반드시 여기서 캡처)
      const refreshToken = data.session.provider_refresh_token;
      if (refreshToken && data.session.user) {
        await supabase
          .from("profiles")
          .update({ google_refresh_token: refreshToken })
          .eq("id", data.session.user.id);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
