import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/", "/pricing", "/login", "/register", "/join", "/forgot-password", "/terms", "/privacy", "/contact"];
function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_ROUTES.slice(1).some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}
export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            res.cookies.set(name, value);
          });
        },
      },
    }
  );

  // Get session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🚫 Not logged in → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const email = user.email;
  const founderEmail = process.env.NEXT_PUBLIC_FOUNDER_EMAIL;

  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isOrgRoute = pathname.startsWith("/org");

  // =========================
  // 1. FOUNDER SPACE RULES
  // =========================
  if (isDashboardRoute) {
    if (email !== founderEmail) {
      // Not founder → redirect to org space
      const { data: orgUser } = await supabase
        .from("org_users")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!orgUser?.org_id) {
        return NextResponse.redirect(new URL("/login", req.url));
      }

      return NextResponse.redirect(new URL(`/org/${orgUser.org_id}`, req.url));
    }

    return res;
  }

  // =========================
  // 2. ORG SPACE RULES
  // =========================
  if (isOrgRoute) {
    const orgIdFromPath = pathname.split("/")[2];

    // Founder can view any org without needing org_users membership
    if (email === founderEmail) {
      return res;
    }

    const { data: membership } = await supabase
      .from("org_users")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", orgIdFromPath)
      .single();

    if (!membership) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return res;
  }

  // =========================
  // 3. DEFAULT PROTECTION
  // =========================
  return res;
}

// Apply middleware only to app routes
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};