import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConsentForm } from "@/components/consent/ConsentForm";

export const dynamic = "force-dynamic";

export default async function ConsentPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 이미 동의했으면 홈으로
  const { data } = await supabase
    .from("profiles")
    .select("terms_agreed_at, privacy_agreed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (data?.terms_agreed_at && data?.privacy_agreed_at) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">
          서비스 이용 동의
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          서비스를 이용하려면 아래 약관에 동의해 주세요.
        </p>
        <div className="mt-6">
          <ConsentForm />
        </div>
      </div>
    </main>
  );
}
