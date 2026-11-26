import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const APP = ["/home", "/card", "/subs", "/history", "/verify", "/profile"];

// Keeps the login fresh and sends people to the right place.
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const inApp = APP.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && inApp) return NextResponse.redirect(new URL("/login", req.url));
  if (user && (path === "/" || path === "/login" || path === "/signup"))
    return NextResponse.redirect(new URL("/home", req.url));
  return res;
}

export const config = { matcher: ["/((?!_next|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)"] };
