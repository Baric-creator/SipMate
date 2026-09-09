import { supabase } from './supabase';

export const PRESENCE_TIMEOUT_MS = 90_000;

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

  const { error } = await supabase
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', session.user.id);

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
