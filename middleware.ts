import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isOnApi =
    req.nextUrl.pathname.startsWith("/api") &&
    !req.nextUrl.pathname.startsWith("/api/auth");

  if ((isOnDashboard || isOnApi) && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (req.nextUrl.pathname === "/login" && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }

  return;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

