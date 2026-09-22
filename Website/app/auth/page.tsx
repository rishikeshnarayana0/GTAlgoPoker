'use client';

import { FormEvent, useEffect, useState } from 'react';
import AccountNav from '../../components/account-nav';

type User = { email: string };

export default function AuthPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/auth/me');
    const data = await response.json() as { user: User | null };
    setUser(data.user); setLoaded(true);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  async function authenticate(event: FormEvent) {
    event.preventDefault(); setMessage('');
    const response = await fetch(creating ? '/api/auth/register' : '/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setMessage(data.error ?? 'Request failed.'); return; }
    await load();
  }
  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    setUser(null); setCreating(false); setPassword('');
  }

  return <main className="auth-page">
    <nav className="upload-nav"><a className="brand" href="/"><img src="/gt-poker-logo.jpeg" alt="AlgoPoker @ GT" /><span>AlgoPoker @ GT</span></a><div><a href="/">Home</a><a href="/competition">Competition</a><AccountNav /></div></nav>
    <section className="auth-shell">
      {!loaded ? <p>Loading…</p> : user ? <div className="auth-card signed-in-card"><p className="section-tag">Your account</p><h1>You’re signed in.</h1><p>{user.email}</p><div className="auth-actions"><a href="/competition">Go to competition</a><button type="button" onClick={signOut}>Sign out</button></div></div>
      : <div className="auth-card"><p className="section-tag">Georgia Tech login</p><h1>{creating ? 'Create your account.' : 'Welcome back.'}</h1><p>Use your @gatech.edu email to access your team and submit bots.</p>
        <form onSubmit={authenticate}><label>Georgia Tech email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@gatech.edu" autoComplete="email" /></label><label>Password<input type="password" required minLength={creating ? 10 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={creating ? 'new-password' : 'current-password'} /></label><button className="gold-button">{creating ? 'Create account' : 'Log in'}</button></form>
        <button className="auth-switch" type="button" onClick={() => { setCreating((value) => !value); setMessage(''); }}>{creating ? 'Already have an account? Log in' : 'New competitor? Create an account'}</button>
        {message && <p className="form-message">{message}</p>}
      </div>}
    </section>
  </main>;
}
