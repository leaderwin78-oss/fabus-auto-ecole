import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Back to the public home page rather than straight to /login: it is the
  // page that offers both "Se connecter" and "S'inscrire", so a user who
  // signed out can pick either — including logging in as someone else.
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
