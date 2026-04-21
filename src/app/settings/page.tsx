import AppHeader from "@/components/AppHeader";
import { SheetConnect } from "@/components/settings/SheetConnect";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name, spreadsheet_id, spreadsheet_url, google_refresh_token")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-neutral-900">설정</h1>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-800">내 정보</h2>
          <dl className="mt-3 space-y-1 text-sm text-neutral-600">
            <div className="flex gap-3">
              <dt className="w-16 text-neutral-400">이름</dt>
              <dd>{profile?.display_name ?? "-"}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 text-neutral-400">이메일</dt>
              <dd>{profile?.email ?? user?.email}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-800">
              Google 스프레드시트 연동
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              방문 기록을 내 Google Drive의 스프레드시트로 동기화합니다.
            </p>
          </div>
          <SheetConnect
            spreadsheetId={profile?.spreadsheet_id ?? null}
            spreadsheetUrl={profile?.spreadsheet_url ?? null}
            hasGoogleToken={!!profile?.google_refresh_token}
          />
        </section>
      </main>
    </>
  );
}
