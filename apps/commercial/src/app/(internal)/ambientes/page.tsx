import React from "react";
import { requireCommercialSession } from "@/lib/auth/session";
import { getStandardEnvironments, getPersonalizedEnvironments } from "@/lib/environments/environment.service";
import EnvironmentsView from "./_components/environments-view";

export default async function AmbientesPage() {
  const user = await requireCommercialSession();
  
  // Fetch data on the server
  const rawStandard = await getStandardEnvironments();
  const rawPersonalized = await getPersonalizedEnvironments();

  // Serialize dates for the client component
  const standardEnvs = rawStandard.map(env => ({
    ...env,
    createdAt: env.createdAt.toISOString(),
    updatedAt: env.updatedAt.toISOString(),
  }));

  const personalizedEnvs = rawPersonalized.map(env => ({
    ...env,
    createdAt: env.createdAt.toISOString(),
    updatedAt: env.updatedAt.toISOString(),
  }));

  return (
    <EnvironmentsView 
      user={user as any} 
      standardEnvs={standardEnvs} 
      personalizedEnvs={personalizedEnvs} 
    />
  );
}
