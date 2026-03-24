import { LoginForm } from "@/components/login-form";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resolveErrorMessage(error: string | string[] | undefined) {
  if (error === "invalid_credentials") {
    return "Usuario ou senha invalidos.";
  }

  return undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolveErrorMessage(resolvedSearchParams?.error);

  return (
    <main>
      <section>
        <p>Modulo comercial</p>
        <h1>Entrar</h1>
        <p>Use seu usuario interno para acessar propostas, catalogo e permissoes.</p>
        <LoginForm errorMessage={errorMessage} />
      </section>
    </main>
  );
}
