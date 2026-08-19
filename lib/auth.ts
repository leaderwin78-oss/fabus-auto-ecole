import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

// Fetches the signed-in user's profile (role + tenant) for use in Server
// Components. Middleware already guarantees a session exists on protected
// routes, but every read still goes through RLS — this never bypasses it.
// Wrapped in React's cache() so layout + page both calling this within the
// same request only hit the database once.
export const requireProfile = cache(async (): Promise<{ userId: string; profile: Profile }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) redirect("/login");

  return { userId: user.id, profile: profile as Profile };
});
