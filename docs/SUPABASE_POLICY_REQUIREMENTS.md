# SipMate — Supabase policy contract

Status snapshot: 15 September 2026

This document defines the minimum backend behavior SipMate expects before public release. It is not a claim about the live Supabase project. The production project must be exported, reviewed and tested against this contract, and repository migrations must be confirmed as applied remotely before release.

## General rules

- RLS must be enabled on every user-owned table.
- Client requests must never be able to spoof ownership fields such as `user_id`, `sender_id`, `reporter_id` or `blocker_id`.
- Premium entitlement fields are server-authoritative and must not be writable by ordinary clients.
- Realtime visibility must never expose rows that ordinary SELECT policies would hide.
- Blocking must be enforced by backend rules for contact actions; hiding buttons in React is not sufficient.
- Internal security material such as device push tokens and one-time OAuth state rows must not be readable by normal app clients.

## profiles

Required behavior:
- authenticated users may read only intentionally public profile fields;
- a user may update only their own row;
- clients must not update authoritative Premium fields;
- precise latitude/longitude columns are not directly selectable by normal app clients;
- Nearby distance is calculated server-side by `get_nearby_profiles`, and own coordinates are obtained only through the private `get_my_profile_location` RPC.

## profile_photos

Required behavior:
- users may insert and delete only rows where `user_id = auth.uid()`;
- profile photo visibility must follow the intended profile visibility model;
- gallery insertion requires a current Premium entitlement;
- no account may exceed six gallery photos, including under concurrent uploads;
- the server-side gallery trigger is authoritative; React checks are UX only.

## cheers

Required behavior:
- INSERT requires `sender_id = auth.uid()`;
- self-Cheers is denied;
- `(sender_id, receiver_id)` is unique;
- reads expose only Cheers involving the current user unless a dedicated backend view intentionally returns less/more;
- blocks prevent new Cheers in either direction.

## conversations

Required behavior:
- SELECT only when current user is `user_one` or `user_two`;
- INSERT requires current user to be one participant;
- participant ordering is canonical and the pair is unique;
- if mutual Cheers is a product requirement for chat creation, enforce it server-side;
- blocks prevent new conversation creation.

## messages

Required behavior:
- SELECT only for members of the referenced conversation;
- INSERT requires `sender_id = auth.uid()` and conversation membership;
- a user cannot alter sender, ownership or content of existing messages through the read-receipt update path;
- `read_at` updates are restricted to legitimate conversation members and intended rows;
- blocks prevent new messages in either direction;
- realtime events obey the same visibility boundary.

## blocks

Required behavior:
- INSERT requires `blocker_id = auth.uid()`;
- DELETE only for blocks created by the current user;
- duplicate block pairs are prevented;
- self-blocking is prevented;
- SELECT reveals only rows needed for the current user's block logic.

## reports

Required behavior:
- INSERT requires `reporter_id = auth.uid()`;
- ordinary users cannot read other users' reports or moderation metadata;
- ordinary users cannot rewrite report ownership or moderation state after submission;
- retention after account deletion must match the published privacy policy.

## skipped_profiles

Required behavior:
- SELECT/INSERT/DELETE only where `user_id = auth.uid()`;
- `(user_id, skipped_user_id)` is unique;
- self-skip should be prevented.

## premium_subscriptions

Required behavior:
- clients may read only their own entitlement/subscription row(s);
- ordinary client writes are denied;
- Stripe/Play provider IDs are not exposed across users;
- only trusted backend billing logic changes authoritative state.

## premium_offers

Required behavior:
- clients may read active offer metadata needed by the UI;
- ordinary client writes are denied;
- subscriber counters and eligibility logic are backend-authoritative.

## device_push_tokens

Required behavior:
- anonymous clients have no table privileges;
- authenticated app clients cannot SELECT push tokens;
- token registration/upsert is performed by the authenticated Edge Function using service-role access;
- the app may DELETE only tokens owned by `auth.uid()` so logout can unregister the current device;
- stale tokens are removed when Expo reports `DeviceNotRegistered`;
- account deletion removes all remaining device tokens for that user before deleting Auth identity.

## Discord internal tables

`discord_oauth_states` and `discord_cheers_announcements` are server-side bookkeeping tables.

Required behavior:
- RLS is enabled;
- anon and authenticated clients have no direct privileges;
- only trusted service-role Edge Functions create, read or remove these rows.

## avatars Storage bucket

Required behavior:
- upload/update/delete is restricted to paths under `<auth.uid()>/...`;
- users cannot overwrite or remove another user's files by crafting object names;
- practical file-size and allowed MIME-type limits are configured;
- public-read behavior is an explicit product/privacy decision;
- account deletion removes the entire user prefix, including orphaned gallery files.

## Helper functions

`is_blocked_between(user_a, user_b)` must not allow arbitrary data exposure. It should return only the boolean needed by the caller and must correctly detect either direction of a block.

Any SECURITY DEFINER helper must pin a safe `search_path`, avoid dynamic SQL unless necessary, and expose only the narrowest permissions required.

## Account deletion transaction order

Before public release, prove this order with disposable accounts:

1. authenticate and resolve the exact user;
2. determine active paid subscription state;
3. terminate or safely schedule provider subscription cleanup according to product policy;
4. remove device push tokens and user-owned Storage objects;
5. remove or anonymize database rows according to verified cascades/retention rules;
6. verify moderation/report retention matches policy;
7. delete the Supabase Auth identity last;
8. sign out the client and reject repeated deletion safely.

## Required abuse tests

Use at least two normal users plus one Premium user and test attempts to:
- read another user's conversations/messages directly;
- forge `sender_id` in messages or Cheers;
- forge `blocker_id` or `reporter_id`;
- create a conversation between two other users;
- message or Cheers across a block;
- query hidden received-Cheers identity as a Free user if identity secrecy is part of Premium access control;
- update `is_premium`, `premium_until`, provider IDs or subscription state from the client;
- read another user's device push token;
- create or read Discord OAuth state rows directly;
- insert gallery photos as Free, as another user, or beyond six photos using concurrent requests;
- upload/delete files under another user's Storage prefix;
- access stale deep links after a block;
- continue using realtime channels after access should have been removed.

Public release remains blocked until the live Supabase project is proven to satisfy the relevant parts of this contract.
