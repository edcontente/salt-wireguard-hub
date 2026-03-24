import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { getCommercialSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.redirect(new URL("/login?error=invalid_credentials", request.url), 303);
  }

  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: {
      profile: true
    }
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.redirect(new URL("/login?error=invalid_credentials", request.url), 303);
  }

  const session = await getCommercialSession();
  session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    profileSlug: user.profile.slug,
    maxFinalPriceAdjustment: user.profile.maxFinalPriceAdjustment,
    canManageCatalog: user.profile.canManageCatalog,
    canManageProposals: user.profile.canManageProposals
  };
  await session.save();

  return NextResponse.redirect(new URL("/", request.url), 303);
}
