import { NextResponse } from "next/server";
import { getCommercialSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const session = await getCommercialSession();

  session.destroy();

  return NextResponse.redirect(new URL("/login", request.url), 303);
}
