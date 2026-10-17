'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    setSubmitting(false);
  };

  if (loading) return <div className="auth-screen" dir="rtl">جاري التحقق من الجلسة...</div>;
  if (session) return <>{children}</>;
  return <main className="auth-screen" dir="rtl"><form className="auth-card" onSubmit={signIn}><div className="brand-mark auth-mark"><span/><span/><span/></div><p className="eyebrow">ERP-Taqa</p><h1>تسجيل دخول مدير النظام</h1><p className="auth-subtitle">سجّل الدخول للوصول إلى منظومة إدارة الطاقة.</p><label>البريد الإلكتروني<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required /></label><label>كلمة المرور<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="auth-error">{error}</p>}<button className="primary-btn auth-submit" type="submit" disabled={submitting}>{submitting ? 'جارٍ الدخول...' : 'دخول'}</button></form></main>;
}
