import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROLE_HOME: Record<string, string> = {
  super_admin: "/super-admin",
  admin: "/admin",
  instructor: "/instructor",
  student: "/student",
};

const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth/callback"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Logged-in users don't need the marketing/login pages.
  if (pathname === "/login" || pathname === "/signup") {
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

  const areaEntry = Object.entries(ROLE_HOME).find(([, base]) => pathname.startsWith(base));
  if (areaEntry) {
    const [role] = areaEntry;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== role) {
      const home = profile ? ROLE_HOME[profile.role] ?? "/login" : "/login";
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return supabaseResponse;
}
