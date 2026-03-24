import React from "react";

type LoginFormProps = {
  errorMessage?: string;
};

export function LoginForm({ errorMessage }: LoginFormProps) {
  return (
    <form action="/api/login" className="login-form" method="post">
      <div className="login-form__field">
        <label htmlFor="email">Usuario</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="login-form__field">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {errorMessage ? (
        <p aria-live="polite" className="login-form__error">
          {errorMessage}
        </p>
      ) : null}
      <button type="submit">Entrar</button>
    </form>
  );
}
