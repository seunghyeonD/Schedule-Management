import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org/current";
import { getMyOrganizations } from "@/app/actions/organizations";
import { OrgSwitcher } from "./OrgSwitcher";
import { DesktopNav } from "./DesktopNav";

export default async function AppHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const orgId = await getCurrentOrgId();
  const orgs = user ? await getMyOrganizations() : [];
  const currentOrg = orgs.find((o) => o.id === orgId) ?? null;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          {/* 데스크탑(sm 이상)에서만 인라인 메뉴 노출. 모바일은 하단 탭바 사용 */}
          <DesktopNav />
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 sm:gap-3">
          {currentOrg && <OrgSwitcher orgs={orgs} currentOrgId={currentOrg.id} />}
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
