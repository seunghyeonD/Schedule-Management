import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId, isCurrentUserMaster } from "@/lib/org/current";
import { getInvitations, getMembers } from "@/app/actions/members";
import { MembersClient } from "./MembersClient";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/organizations");

  const isMaster = await isCurrentUserMaster(orgId);
  if (!isMaster) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
          <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
            멤버 관리
          </h1>
          <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            마스터만 멤버를 관리할 수 있습니다.
          </p>
        </main>
      </>
    );
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();

  const [members, invitations] = await Promise.all([
    getMembers(orgId),
    getInvitations(orgId),
  ]);

  return (
    <>
      <AppHeader />
      <MembersClient
        orgId={orgId}
        orgName={org?.name ?? ""}
        members={members}
        invitations={invitations}
        currentUserId={user.id}
      />
    </>
  );
}
