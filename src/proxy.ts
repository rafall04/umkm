import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/enums";

const DASHBOARD_ROLES: Role[] = ["VENDOR", "ADMIN_DESA", "SUPERADMIN"];
const ADMIN_ROLES: Role[] = ["ADMIN_DESA", "SUPERADMIN"];

export default auth((req) => {
  const { nextUrl } = req;
  const user = req.auth?.user;

  if (!user) {
    const login = new URL("/login", nextUrl);
    login.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  if (nextUrl.pathname.startsWith("/admin") && !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (nextUrl.pathname.startsWith("/dashboard") && !DASHBOARD_ROLES.includes(user.role)) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
