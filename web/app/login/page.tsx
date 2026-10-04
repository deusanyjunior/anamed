'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="card login-card">
        <div className="pill">Aniah</div>
        <h1>Entrar na Aniah</h1>
        <p className="subtitle">Faça login com sua conta Google institucional da Unifesp para usar a tutora de anatomia.</p>
        <button className="btn btn-primary" onClick={() => signIn('google', { callbackUrl: '/' })}>
          Entrar com Google
        </button>
        <p className="small login-note">O acesso está limitado a endereços verificados @unifesp.br.</p>
      </section>
    </main>
  );
}
