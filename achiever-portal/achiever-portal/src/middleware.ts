import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PORTAL_PATHS = new Set([
  "/student/login",
  "/faculty/login",
  "/faculty/invite",
  "/admin/login",
]);

function loginPathFor(pathname: string): string | null {
  if (pathname.startsWith("/student")) return "/student/login";
  if (pathname.startsWith("/faculty")) return "/faculty/login";
  if (pathname.startsWith("/admin")) return "/admin/login";
  if (pathname.startsWith("/portal")) return "/student/login";
  return null;
}

/**
 * 1. Refreshes the Supabase session cookie on every request.
 * 2. Sends signed-out visitors of private areas to the right login page.
 * Role checks happen again on the server in every portal layout and action —
 * this middleware is only the first gate.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const loginPath = loginPathFor(pathname);
  if (loginPath && !PUBLIC_PORTAL_PATHS.has(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = loginPath;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
