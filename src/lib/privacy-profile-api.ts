import { supabase } from './supabase';

export type PublicProfile = {
  id: string;
  name: string | null;
  age: number | null;
  city: string | null;
  bio: string | null;
  currently_up_for: string | null;
  is_active: boolean | null;
  avatar_url: string | null;
  avatar_path: string | null;
  gender: string | null;
};

export type NearbyProfile = PublicProfile & {
  distance_km: number;
};

export type ProfilePhotoSummary = {
  id: string;
  photo_url: string;
  storage_path?: string | null;
  sort_order: number | null;
};

export type BlockedUserSummary = Pick<
  PublicProfile,
  'id' | 'name' | 'age' | 'city' | 'avatar_url' | 'avatar_path'
>;

export type SkippedProfileSummary = Pick<
  PublicProfile,
  'id' | 'name' | 'age' | 'avatar_url' | 'avatar_path' | 'currently_up_for' | 'gender'
>;

export type ChatListItem = {
  conversation_id: string;
  user_id: string;
  name: string | null;
  age: number | null;
  is_active: boolean | null;
  avatar_url: string | null;
  avatar_path?: string | null;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number | string | null;
};

export type CheersRelationship = 'none' | 'sent' | 'mutual';

export type CheersOverviewItem = {
  cheers_id: string;
  user_id: string | null;
  name: string | null;
  age: number | null;
  status: 'Mutual Cheers' | 'Sent' | 'Received';
  identity_revealed: boolean;
  created_at: string;
};

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function getPublicProfile(targetUserId: string) {
  const { data, error } = await supabase.rpc('get_public_profile', {
    target_user_id: targetUserId,
  });
  throwIfError(error);
  return ((data ?? [])[0] ?? null) as PublicProfile | null;
}

export async function getProfilePhotos(targetUserId: string) {
  const { data, error } = await supabase.rpc('get_profile_photos', {
    target_user_id: targetUserId,
  });
  throwIfError(error);
  return (data ?? []) as ProfilePhotoSummary[];
}

export async function getNearbyProfiles(options?: {
  maxDistanceKm?: number;
  customOriginLatitude?: number | null;
  customOriginLongitude?: number | null;
}) {
  const { data, error } = await supabase.rpc('get_nearby_profiles', {
    max_distance_km: options?.maxDistanceKm ?? 10,
    custom_origin_latitude: options?.customOriginLatitude ?? null,
    custom_origin_longitude: options?.customOriginLongitude ?? null,
  });
  throwIfError(error);
  return (data ?? []) as NearbyProfile[];
}

export async function getBlockedUsers() {
  const { data, error } = await supabase.rpc('get_blocked_users');
  throwIfError(error);
  return (data ?? []) as BlockedUserSummary[];
}

export async function getSkippedProfileSummaries() {
  const { data, error } = await supabase.rpc('get_skipped_profile_summaries');
  throwIfError(error);
  return (data ?? []) as SkippedProfileSummary[];
}

export async function getChatList() {
  const { data, error } = await supabase.rpc('get_chat_list');
  throwIfError(error);
  return (data ?? []) as ChatListItem[];
}

export async function getCheersRelationship(targetUserId: string) {
  const { data, error } = await supabase.rpc('get_cheers_relationship', {
    target_user_id: targetUserId,
  });
  throwIfError(error);
  return (data ?? 'none') as CheersRelationship;
}

export async function getCheersOverview() {
  const { data, error } = await supabase.rpc('get_cheers_overview');
  throwIfError(error);
  return (data ?? []) as CheersOverviewItem[];
}
