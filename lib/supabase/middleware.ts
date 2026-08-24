import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseUrl, supabaseAnonKey } from "@/lib/env";

// Maps a role to its dashboard area. admin_auto_ecole (delegated staff)
// shares the same /admin area as admin (the school owner) — RLS is what
// actually restricts what admin_auto_ecole can write, not routing.
const ROLE_HOME: Record<string, string> = {
  super_admin: "/super-admin",
  admin: "/admin",
  admin_auto_ecole: "/admin",
  instructor: "/instructor",
  student: "/student",
};

const ROLES_BY_AREA: Record<string, string[]> = {
  "/super-admin": ["super_admin"],
  "/admin": ["admin", "admin_auto_ecole"],
  "/instructor": ["instructor"],
  "/student": ["student"],
};

const PUBLIC_PATHS = ["/", "/login", "/auth/callback", "/annonces", "/confidentialite", "/conditions"];
const PUBLIC_PREFIXES = ["/signup"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // Marketing anchors / static assets under /public, Next internals.
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/public")
  );
}

// Runs on every request: refreshes the Supabase session cookie and enforces
// the auth + role-area gate before any page renders. This is the app's
// outer perimeter; RLS in Postgres is the hard backstop underneath it.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (isPublicPath(pathname)) return supabaseResponse;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged-in users don't need the marketing/login/signup pages.
  if (pathname === "/login" || pathname.startsWith("/signup")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const home = profile ? ROLE_HOME[profile.role] ?? "/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (pathname === "/dashboard") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const home = profile ? ROLE_HOME[profile.role] : null;
    return NextResponse.redirect(new URL(home ?? "/login", request.url));
  }

  // Forced password change (bootstrapped super_admin, section 2) takes
  // priority over every other authenticated route except signing out.
  if (pathname !== "/change-password" && pathname !== "/auth/signout") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, must_change_password, status, organization_id, organizations(status)")
      .eq("id", user.id)
      .single();

    if (profile?.must_change_password) {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }

    // Two independent reasons to be held at the door:
    //  - the account itself is not approved (a self-registered moniteur), or
    //  - the whole auto-école is still awaiting the super admin's decision,
    //    in which case none of its members can work yet.
    // super_admin has no organization, so the org check must tolerate null.
    const org = Array.isArray(profile?.organizations) ? profile.organizations[0] : profile?.organizations;
    const orgStatus = (org as { status?: string } | null | undefined)?.status;
    const held = profile
      ? profile.status !== "active" || (orgStatus !== undefined && orgStatus !== "active")
      : false;

    // RLS already hides every tenant row from a held account (see same_org()
    // in 0008_signup.sql); this just shows an explanation rather than a
    // dashboard full of empty tables.
    if (held && pathname !== "/pending") {
      return NextResponse.redirect(new URL("/pending", request.url));
    }

    // Abonnement échu au-delà du délai de grâce : l'encadrement de l'école est
    // renvoyé vers la page de renouvellement. Les élèves et les moniteurs ne
    // sont pas punis pour un impayé qui ne les concerne pas — ils gardent leur
    // accès, c'est la direction qui doit régulariser.
    if (!held && profile && (profile.role === "admin" || profile.role === "admin_auto_ecole")) {
      const echappatoires = ["/abonnement", "/account", "/auth/signout"];
      if (!echappatoires.some((e) => pathname.startsWith(e))) {
        const { data: etat } = await supabase.rpc("etat_abonnement", { p_org: (profile as { organization_id?: string }).organization_id ?? null });
        if (etat === "expire") {
          return NextResponse.redirect(new URL("/abonnement", request.url));
        }
      }
    }
    if (profile && !held && pathname === "/pending") {
      return NextResponse.redirect(new URL(ROLE_HOME[profile.role] ?? "/dashboard", request.url));
    }

    const areaEntry = Object.entries(ROLES_BY_AREA).find(([base]) => pathname.startsWith(base));
    if (areaEntry) {
      const [, allowedRoles] = areaEntry;
      if (!profile || !allowedRoles.includes(profile.role)) {
        const home = profile ? ROLE_HOME[profile.role] ?? "/login" : "/login";
        return NextResponse.redirect(new URL(home, request.url));
      }
    }
  }

  return supabaseResponse;
}
