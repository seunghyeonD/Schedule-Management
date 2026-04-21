import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AppHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-base font-semibold text-neutral-900">
            일정 관리
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-600">
            <Link href="/" className="hover:text-neutral-900">
              캘린더
            </Link>
            <Link href="/stores" className="hover:text-neutral-900">
              매장 관리
            </Link>
            <Link href="/settings" className="hover:text-neutral-900">
              설정
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          {user && <span className="hidden sm:inline">{user.email}</span>}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
