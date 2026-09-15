import { supabase } from './supabase';

export const PRESENCE_TIMEOUT_MS = 90_000;
export const ACTIVE_SESSION_DURATION_MS = 3 * 60 * 60 * 1000;

export function getActiveUntilIso() {
  return new Date(Date.now() + ACTIVE_SESSION_DURATION_MS).toISOString();
}

export function isProfileAvailable(profile: {
  is_active?: boolean | null;
  active_until?: string | null;
}) {
  if (profile.is_active !== true || !profile.active_until) return false;
  const activeUntil = new Date(profile.active_until).getTime();
  return Number.isFinite(activeUntil) && activeUntil > Date.now();
}

export function isProfileOnline(profile: {
  is_active?: boolean | null;
  last_seen_at?: string | null;
}) {
  if (profile.is_active !== true || !profile.last_seen_at) return false;
  const seenAt = new Date(profile.last_seen_at).getTime();
  if (!Number.isFinite(seenAt)) return false;
  return Date.now() - seenAt <= PRESENCE_TIMEOUT_MS;
}

export async function touchPresence() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('profiles')
    .update({ last_seen_at: now })
    .eq('id', session.user.id)
    .eq('is_active', true)
    .gt('active_until', now);

  if (error) console.log('PRESENCE UPDATE ERROR:', error.message);
}

export async function clearPresence() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { error } = await supabase
    .from('profiles')
    .update({ last_seen_at: null })
    .eq('id', session.user.id);

  if (error) console.log('PRESENCE CLEAR ERROR:', error.message);
}

export async function stopActiveSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false, active_until: null, last_seen_at: null })
    .eq('id', session.user.id);

  if (error) console.log('ACTIVE SESSION STOP ERROR:', error.message);
}
