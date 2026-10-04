'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { signIn, signOut, useSession } from 'next-auth/react';

type Message = { role: 'user' | 'assistant'; content: string };

const welcome: Message = {
  role: 'assistant',
  content: 'Olá! Eu sou a Aniah. Posso ajudar você a revisar e compreender conteúdos de anatomia.',
};

export default function AniahChat() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function resetConversation() {
    setMessages([welcome]);
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading || status !== 'authenticated') return;

    const nextMessages = [...messages, { role: 'user' as const, content }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const payload = await response.json() as { answer?: string; error?: string };
      if (!response.ok || !payload.answer) throw new Error(payload.error || 'Não foi possível obter uma resposta.');
      setMessages(previous => [...previous, { role: 'assistant', content: payload.answer! }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível obter uma resposta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="aniah-root">
      {open && (
        <section id="aniah-chat" className="aniah-panel card" aria-label="Chat da Aniah">
          <header className="aniah-header">
            <div>
              <strong>Aniah</strong>
              <div className="small">Tutora de anatomia</div>
            </div>
            <button className="aniah-close" type="button" onClick={() => setOpen(false)} aria-label="Fechar chat">×</button>
          </header>

          {status === 'loading' && <p className="small aniah-state">Verificando login…</p>}
          {status === 'unauthenticated' && (
            <div className="aniah-login">
              <p>Entre com seu Google institucional para conversar com a Aniah.</p>
              <button className="btn btn-primary" type="button" onClick={() => signIn('google', { callbackUrl: window.location.href })}>Entrar com Google</button>
              <p className="small">Disponível para emails verificados @unifesp.br.</p>
            </div>
          )}
          {status === 'authenticated' && (
            <>
              <div className="aniah-account">
                <span className="small">{session.user?.email}</span>
                <button className="link-button" type="button" onClick={() => signOut({ callbackUrl: window.location.href })}>Sair</button>
              </div>
              <div className="aniah-messages" aria-live="polite">
                {messages.map((message, index) => (
                  <div className={`aniah-message aniah-message-${message.role}`} key={`${message.role}-${index}`}>
                    <strong>{message.role === 'user' ? 'Você' : 'Aniah'}</strong>
                    {message.role === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: props => <a {...props} target="_blank" rel="noreferrer" />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : <p>{message.content}</p>}
                  </div>
                ))}
                {loading && <div className="aniah-message aniah-message-assistant"><strong>Aniah</strong><p aria-label="Aniah está escrevendo">Pensando…</p></div>}
                <div ref={messagesEnd} />
              </div>
              {error && <p className="aniah-error" role="alert">{error}</p>}
              <form className="aniah-form" onSubmit={submit}>
                <label className="sr-only" htmlFor="aniah-message">Mensagem para Aniah</label>
                <textarea id="aniah-message" className="input aniah-input" value={input} onChange={event => setInput(event.target.value)} placeholder="Pergunte sobre anatomia…" rows={2} maxLength={4000} disabled={loading} />
                <div className="aniah-actions">
                  <button className="btn" type="button" onClick={resetConversation} disabled={loading}>Limpar</button>
                  <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()}>Enviar</button>
                </div>
              </form>
            </>
          )}
        </section>
      )}
      <button className="aniah-launcher" type="button" onClick={() => setOpen(previous => !previous)} aria-expanded={open} aria-controls="aniah-chat">
        <span aria-hidden="true">✦</span> Aniah
      </button>
    </div>
  );
}
