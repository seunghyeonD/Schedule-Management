import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AppHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link
            href="/"
            className="shrink-0 text-base font-semibold text-neutral-900"
          >
            일정 관리
          </Link>
          {/* 데스크탑(sm 이상)에서만 인라인 메뉴 노출. 모바일은 하단 탭바 사용 */}
          <nav className="hidden items-center gap-4 text-sm text-neutral-600 sm:flex">
            <Link href="/" className="hover:text-neutral-900">
              캘린더
            </Link>
            <Link href="/stores" className="hover:text-neutral-900">
              매장
            </Link>
            <Link href="/settings" className="hover:text-neutral-900">
              설정
            </Link>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 sm:gap-3">
          {user && (
            <span className="hidden max-w-[160px] truncate md:inline">
              {user.email}
            </span>
          )}
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
