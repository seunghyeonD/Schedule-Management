import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyOrganizations } from "@/app/actions/organizations";
import { OrganizationsClient } from "./OrganizationsClient";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgs = await getMyOrganizations();

  return <OrganizationsClient orgs={orgs} userEmail={user.email ?? ""} />;
}
