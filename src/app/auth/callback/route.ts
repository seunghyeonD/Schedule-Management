import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

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
