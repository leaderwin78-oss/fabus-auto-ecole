import { redirect } from "next/navigation";

// The school wizard moved to /signup/auto-ecole so all three signup paths use
// French URLs (/signup/eleve, /signup/auto-ecole, /signup/moniteur). This
// keeps older links — including the ones already shared publicly — working.
export default async function LegacySchoolSignupRedirect({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  redirect(ref ? `/signup/auto-ecole?ref=${encodeURIComponent(ref)}` : "/signup/auto-ecole");
}
