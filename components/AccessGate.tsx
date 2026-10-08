'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ACCESS_DURATION, ACCESS_STORAGE_KEY, readAccessGrant, validateAccessConfig, verifyAccessPassword } from '@/lib/access.mjs';
import type { AccessConfig, AccessGrant } from '@/lib/access.mjs';

async function loadConfig(): Promise<AccessConfig> {
  const response = await fetch(`/access-config.json?t=${Date.now()}-${crypto.randomUUID()}`, {
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('configuration');
  const configuration = validateAccessConfig(await response.json());
  if (!configuration) throw new Error('configuration');
  return configuration;
}

export default function AccessGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(false);
  const [message, setMessage] = useState('Verificando a configuração de acesso…');
  const [memoryOnly, setMemoryOnly] = useState(false);
  const config = useRef<AccessConfig | null>(null);
  const grant = useRef<AccessGrant | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const mounted = useRef(false);
  const storageUnavailable = useRef(false);

  function lock(text = 'Digite a senha para acessar o portal.') {
    generation.current++;
    grant.current = null;
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    if (input.current) input.current.value = '';
    setUnlocked(false); setReady(config.current !== null); setBusy(false); setShown(false); setMessage(text);
  }

  function activate(value: AccessGrant) {
    grant.current = value;
    setUnlocked(true); setMessage('');
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    expiryTimer.current = setTimeout(() => {
      try { localStorage.removeItem(ACCESS_STORAGE_KEY); } catch { /* memory-only session */ }
      lock('O prazo de oito horas terminou. Digite a senha novamente.');
      channel.current?.postMessage('logout');
    }, Math.max(0, value.expiresAt - Date.now()));
  }

  async function refresh(conceal = false) {
    const ticket = ++generation.current;
    if (conceal) { setUnlocked(false); setReady(false); }
    try {
      if (!crypto?.subtle) throw new Error('unsupported');
      const next = await loadConfig();
      if (!mounted.current || ticket !== generation.current) return;
      config.current = next; setReady(true);
      let value: AccessGrant | null;
      try {
        const raw = localStorage.getItem(ACCESS_STORAGE_KEY);
        value = readAccessGrant(raw, next, Date.now());
        if (storageUnavailable.current && raw === null) value = readAccessGrant(JSON.stringify(grant.current), next, Date.now());
        setMemoryOnly(storageUnavailable.current);
      } catch {
        value = readAccessGrant(JSON.stringify(grant.current), next, Date.now());
        storageUnavailable.current = true;
        setMemoryOnly(true);
      }
      if (value) activate(value);
      else lock();
    } catch {
      if (!mounted.current || ticket !== generation.current) return;
      config.current = null; setReady(false);
      lock('Não foi possível validar a configuração de acesso. Verifique a conexão e tente novamente. O portal permanece bloqueado.');
    }
  }

  useEffect(() => {
    mounted.current = true;
    void refresh(true);
    try {
      channel.current = new BroadcastChannel('relalia.access');
      channel.current.onmessage = event => { if (event.data === 'logout') lock('A liberação foi encerrada em outra aba.'); };
    } catch { /* storage events still synchronize when available */ }
    const onReturn = () => { if (document.visibilityState === 'visible') void refresh(true); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === ACCESS_STORAGE_KEY || event.key === null) {
        lock('A liberação foi alterada em outra aba.');
        void refresh(true);
      }
    };
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible' && !busyRef.current) void refresh();
    }, 60000);
    window.addEventListener('focus', onReturn);
    window.addEventListener('pageshow', onReturn);
    window.addEventListener('online', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('storage', onStorage);
    return () => {
      mounted.current = false; generation.current++;
      clearInterval(poll); if (expiryTimer.current) clearTimeout(expiryTimer.current);
      channel.current?.close(); channel.current = null;
      window.removeEventListener('focus', onReturn); window.removeEventListener('pageshow', onReturn);
      window.removeEventListener('online', onReturn); document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('storage', onStorage);
    };
  // The provider lives across client navigation; callbacks read current configuration/grant refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const busyRef = useRef(false);
  busyRef.current = busy;

  useEffect(() => {
    if (!unlocked && ready && !busy) input.current?.focus();
    if (unlocked) document.getElementById('portal-content')?.focus();
  }, [unlocked, ready, busy]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !ready || !input.current) return;
    // Uncontrolled field: the password is never put into React state or storage.
    let password = input.current.value;
    input.current.value = '';
    setShown(false); setBusy(true); setMessage('Verificando a senha…');
    const ticket = ++generation.current;
    try {
      const next = await loadConfig();
      const valid = await verifyAccessPassword(password, next, crypto.subtle);
      password = '';
      if (!mounted.current || ticket !== generation.current) return;
      config.current = next;
      if (!valid) { setMessage('Senha incorreta. Tente novamente.'); return; }
      const value = { version: next.version, expiresAt: Date.now() + ACCESS_DURATION };
      try { localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(value)); storageUnavailable.current = false; setMemoryOnly(false); }
      catch { storageUnavailable.current = true; setMemoryOnly(true); }
      activate(value);
    } catch {
      if (mounted.current && ticket === generation.current) {
        config.current = null; setReady(false);
        lock('Não foi possível verificar o acesso. A configuração ou os recursos do navegador estão indisponíveis. Tente novamente.');
      }
    } finally {
      password = '';
      if (mounted.current && ticket === generation.current) setBusy(false);
    }
  }

  function logout() {
    try { localStorage.removeItem(ACCESS_STORAGE_KEY); } catch { /* memory-only session */ }
    channel.current?.postMessage('logout');
    lock('Você saiu do portal.');
  }

  if (unlocked) return <>
    <div className="access-toolbar"><span>{memoryOnly ? 'Liberação nesta aba; não será salva.' : 'Liberação temporária por até oito horas.'}</span><button className="action" onClick={logout}>Sair</button></div>
    <div id="portal-content" tabIndex={-1}>{children}</div>
  </>;

  return <main className="access-screen"><section className="access-card" aria-labelledby="access-title">
    <p className="access-brand">Relalia: O Relatório da Alia</p>
    <h1 id="access-title">Acesso ao portal</h1>
    <p className="access-description">Digite a senha compartilhada para consultar os relatórios. A liberação dura até oito horas.</p>
    <form onSubmit={submit}>
      <label htmlFor="access-password">Senha</label>
      <div className="access-password"><input ref={input} id="access-password" name="password" type={shown ? 'text' : 'password'} autoComplete="current-password" required disabled={!ready || busy} aria-describedby="access-message" /><button type="button" className="action" disabled={!ready || busy} aria-label={shown ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={shown} onClick={() => setShown(!shown)}>{shown ? 'Ocultar' : 'Mostrar'}</button></div>
      <button className="action primary access-submit" disabled={!ready || busy} type="submit">{busy ? 'Verificando…' : 'Entrar'}</button>
    </form>
    <p id="access-message" role="status" aria-live="polite" aria-atomic="true">{message}</p>
    {!ready && <button className="action" type="button" onClick={() => void refresh(true)}>Tentar novamente</button>}
    <noscript><p className="access-error">JavaScript está desativado. Ative-o para verificar a senha e abrir a interface do portal.</p></noscript>
  </section></main>;
}
