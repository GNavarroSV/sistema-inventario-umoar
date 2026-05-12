'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLogin } from '../hooks/auth/use-login';
import { BrandLogo } from './brand-logo';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();
  const errorMessage = loginMutation.error instanceof Error ? loginMutation.error.message : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loginMutation.mutateAsync({ email, password });
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <BrandLogo />
        <p className="eyebrow">Acceso al sistema</p>
        <h1>Bienvenido</h1>
        <p className="auth-hero__text">
          Inicia sesión con tu cuenta institucional para continuar.
        </p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card__header">
            <div>
              <p className="eyebrow">Inicio de sesión</p>
              <h2>Ingresa tus datos</h2>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Correo institucional</span>
              <input
                className="input"
                type="email"
                placeholder="usuario@universidad.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span>Contraseña</span>
              <input
                className="input"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {errorMessage ? <p className="login-error">{errorMessage}</p> : null}

            <button className="button button--primary button--full" type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'Ingresando...' : 'Entrar'}
            </button>
          </form>

          <div className="auth-card__footer">
            <p>Acceso institucional protegido.</p>
          </div>
        </div>
      </section>
    </div>
  );
}