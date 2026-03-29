import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type CommercialSessionUser = {
  id: string;
  email: string;
  name: string;
  profileSlug: string;
  maxFinalPriceAdjustment: number;
  canManageCatalog: boolean;
  canManageProposals: boolean;
  canManageUsers: boolean;
};

export type CommercialSessionData = {
  user?: CommercialSessionUser;
};

const sessionPassword = process.env.SESSION_PASSWORD;

if (!sessionPassword) {
  throw new Error("SESSION_PASSWORD must be configured.");
}

export const commercialSessionOptions: SessionOptions = {
  cookieName: "commercial_session",
  password: sessionPassword,
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  }
};

export async function getCommercialSession() {
  return getIronSession<CommercialSessionData>(
    await cookies(),
    commercialSessionOptions
  );
}

export async function requireCommercialSession() {
  const session = await getCommercialSession();

  if (!session.user) {
    redirect("/login");
  }

  return session.user;
}
