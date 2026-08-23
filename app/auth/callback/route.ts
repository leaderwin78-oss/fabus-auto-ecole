import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect from Supabase email confirmation / magic links.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // L'échec était ignoré : l'utilisateur atterrissait sur /dashboard, se
    // faisait renvoyer au login, et n'apprenait jamais que son lien avait
    // expiré. Le détail reste côté serveur, le motif générique côté client.
    if (error) {
      console.error("[auth/callback]", error.message);
      return NextResponse.redirect(`${origin}/login?erreur=lien_invalide`);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
