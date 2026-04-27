import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { SheetConnect } from "@/components/settings/SheetConnect";
import { FontSizeSetting } from "@/components/settings/FontSizeSetting";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId, isCurrentUserMaster } from "@/lib/org/current";
import { getUserFontSize } from "@/lib/preferences";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name, google_refresh_token")
    .eq("id", user!.id)
    .maybeSingle();

  const orgId = await getCurrentOrgId();
  const isMaster = orgId ? await isCurrentUserMaster(orgId) : false;
  const fontSize = await getUserFontSize();

  let orgInfo: {
    name: string;
    spreadsheet_id: string | null;
    spreadsheet_url: string | null;
  } | null = null;
  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name, spreadsheet_id, spreadsheet_url")
      .eq("id", orgId)
      .maybeSingle();
    if (org) orgInfo = org;
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
          설정
        </h1>

        <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:mt-6 sm:p-5">
          <h2 className="text-sm font-semibold text-neutral-800">내 정보</h2>
          <dl className="mt-3 space-y-1 text-sm text-neutral-600">
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-neutral-400">이름</dt>
              <dd className="min-w-0 truncate">
                {profile?.display_name ?? "-"}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-neutral-400">이메일</dt>
              <dd className="min-w-0 truncate">
                {profile?.email ?? user?.email}
              </dd>
            </div>
            {orgInfo && (
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-neutral-400">현재 기업</dt>
                <dd className="min-w-0 truncate">
                  {orgInfo.name}{" "}
                  <span className="text-xs text-neutral-400">
                    ({isMaster ? "마스터" : "멤버"})
                  </span>
                </dd>
              </div>
            )}
          </dl>
          {isMaster && (
            <div className="mt-3 border-t border-neutral-100 pt-3">
              <Link
                href="/settings/members"
                className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-neutral-900"
              >
                멤버 관리 →
              </Link>
            </div>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:mt-6 sm:p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-800">
              Google 스프레드시트 연동
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              {isMaster
                ? "기업의 방문 기록을 마스터의 Google Drive 스프레드시트로 통합 동기화합니다."
                : "마스터만 시트를 연결할 수 있습니다. 시트 동기화는 마스터가 실행합니다."}
            </p>
          </div>
          {isMaster ? (
            <SheetConnect
              spreadsheetId={orgInfo?.spreadsheet_id ?? null}
              spreadsheetUrl={orgInfo?.spreadsheet_url ?? null}
              hasGoogleToken={!!profile?.google_refresh_token}
            />
          ) : (
            <p className="text-xs text-neutral-500">
              {orgInfo?.spreadsheet_url ? (
                <a
                  href={orgInfo.spreadsheet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  연결된 시트 보기
                </a>
              ) : (
                "아직 시트가 연결되지 않았습니다."
              )}
            </p>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:mt-6 sm:p-5">
          <h2 className="text-sm font-semibold text-neutral-800">글자 크기</h2>
          <div className="mt-3">
            <FontSizeSetting current={fontSize} />
          </div>
        </section>
      </main>
    </>
  );
}
