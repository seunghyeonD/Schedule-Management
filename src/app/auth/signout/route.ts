import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  const res = NextResponse.redirect(`${origin}/login`, { status: 302 });
  // 로그아웃 시 org 컨텍스트도 비움
  res.cookies.delete("current_org_id");
  return res;
}
