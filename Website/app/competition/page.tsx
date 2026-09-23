'use client';

import { FormEvent, useEffect, useState } from 'react';
import AccountNav from '../../components/account-nav';

type Team = { id: string; name: string; invite_code: string; rating: number; games_played: number; active_submission_id: string | null };
type Member = { email: string; role: string };
type Submission = { id: string; version: number; language: string; filename: string; size_bytes: number; created_at: string };
type Leader = { id: string; name: string; rating: number; games_played: number; active_submission_id: string | null; member_count: number };
type Match = { id: string; status: string; created_at: string };
type State = { team: Team | null; members: Member[]; submissions: Submission[]; leaderboard: Leader[]; matches: Match[] };

const EMPTY: State = { team: null, members: [], submissions: [], leaderboard: [], matches: [] };

export default function CompetitionPage() {
  const [state, setState] = useState<State>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/competition');
    const data = await response.json().catch(() => ({})) as State & { error?: string };
    if (response.status === 401) { setMessage('Log in to create or join a team and submit bots.'); setLoaded(true); return; }
    if (!response.ok) { setMessage(data.error ?? 'Could not load competition data.'); setLoaded(true); return; }
    setState(data); setLoaded(true);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  async function send(body: object | FormData) {
    setMessage('Working…');
    const response = await fetch('/api/competition', body instanceof FormData
      ? { method: 'POST', body }
      : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({})) as State & { error?: string };
    if (!response.ok) { setMessage(data.error ?? 'Request failed.'); return false; }
    setMessage('Saved.');
    await load(); return true;
  }
  async function formAction(event: FormEvent<HTMLFormElement>, action: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    if (await send({ action, ...body })) event.currentTarget.reset();
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); form.set('action', 'submission');
    if (await send(form)) event.currentTarget.reset();
  }
  return <main className="competition-page">
    <nav className="upload-nav"><a className="brand" href="/"><img src="/gt-poker-logo.jpeg" alt="AlgoPoker @ GT" /><span>AlgoPoker @ GT</span></a><div><a href="/">Home</a><AccountNav /></div></nav>
    <section className="competition-shell">
      {!loaded ? <p>Loading…</p> : <>
        {message && <p className="form-message">{message}</p>}
        {!state.team ? <div className="team-onboarding">
          <form onSubmit={(event) => formAction(event, 'create_team')}><h2>Create a team</h2><p>Teams have one to four Georgia Tech students.</p><input name="name" required minLength={2} maxLength={50} placeholder="Team name" /><button>Create team</button></form>
          <form onSubmit={(event) => formAction(event, 'join_team')}><h2>Join a team</h2><p>A student can belong to only one team.</p><input name="invite_code" required placeholder="Invite code" /><button>Join team</button></form>
        </div> : <>
          <section className="team-summary"><div><p>Your team</p><h2>{state.team.name}</h2><span>{Math.round(state.team.rating)} ELO · {state.team.games_played} matches</span></div><div><p>Invite code</p><code>{state.team.invite_code}</code><span>{state.members.length}/4 members</span></div></section>
          <section className="competition-grid">
            <div><h2>Members</h2><div className="plain-list">{state.members.map((member) => <p key={member.email}><span>{member.email}</span><small>{member.role}</small></p>)}</div></div>
            <form className="competition-upload" onSubmit={upload}><h2>Submit a version</h2><p>The newest upload becomes your team’s active entry.</p><input type="file" name="file" required accept=".py,.cpp,.cc,.rs" /><button>Upload submission</button></form>
          </section>
          <section><h2>Submission history</h2><div className="plain-list">{state.submissions.length ? state.submissions.map((item) => <p key={item.id}><span>v{item.version} · {item.filename}</span><small>{item.language}</small></p>) : <p><span>No team submissions yet.</span></p>}</div></section>
        </>}
        <section className="leaderboard"><div className="section-title"><h2>Leaderboard</h2><span>Every active team is scheduled once per ladder round. New rounds begin every six hours.</span></div>
          <div className="leader-table">{state.leaderboard.map((team, index) => <div key={team.id} className={`leader-row${team.active_submission_id ? '' : ' inactive'}`}><b>{index + 1}</b><span>{team.name}</span><small>{team.member_count}/4</small><strong>{Math.round(team.rating)}</strong></div>)}</div>
        </section>
        {state.matches.length > 0 && <section><h2>Your recent matches</h2><div className="plain-list">{state.matches.map((match) => <p key={match.id}><span>{match.id}</span><small>{match.status}</small></p>)}</div></section>}
      </>}
    </section>
  </main>;
}
