'use client';

import { useEffect, useState } from 'react';

type User = { email: string };

export default function AccountNav() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/auth/me').then((response) => response.json()).then((data: { user?: User | null }) => {
      if (active) setUser(data.user ?? null);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return <a className="account-link" href="/auth">{user?.email ?? 'Log in'}</a>;
}
