import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MessagingPanel } from "@/components/MessagingPanel";

export default async function StudentMessagesPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("organization_id", profile.organization_id ?? "")
    .in("role", ["admin", "instructor"])
    .neq("id", userId);

  return (
    <>
      <h3 className="mb-4">Messages</h3>
      <MessagingPanel userId={userId} contacts={contacts ?? []} />
    </>
  );
}
