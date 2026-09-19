import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';

function cleanText(value: unknown, max = 180) {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, max);
}

function safeMetadata(metadata: Record<string, unknown> = {}) {
  const blocked = new Set(['email', 'password', 'token', 'authorization', 'message', 'content', 'latitude', 'longitude']);
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata).slice(0, 12)) {
    if (blocked.has(key.toLowerCase())) continue;
    if (value === null || typeof value === 'number' || typeof value === 'boolean') out[key] = value as any;
    else out[key] = cleanText(value, 120);
  }
  return out;
}

export async function logClientEvent(
  eventType: string,
  screen?: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase.from('client_events').insert({
      user_id: session.user.id,
      event_type: cleanText(eventType, 80),
      screen: screen ? cleanText(screen, 80) : null,
      app_version: cleanText(Constants.expoConfig?.version ?? 'unknown', 30),
      platform: Platform.OS,
      metadata: safeMetadata(metadata),
    });
  } catch {
    // Telemetry must never break the app.
  }
}

let installed = false;

export function installGlobalTelemetry() {
  if (installed) return;
  installed = true;

  const globalAny = globalThis as any;
  const errorUtils = globalAny.ErrorUtils;
  if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      void logClientEvent('js_error', 'global', {
        name: error?.name,
        error: error?.message,
        fatal: Boolean(isFatal),
      });
      previous?.(error, isFatal);
    });
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason ?? 'unknown'));
      void logClientEvent('unhandled_rejection', 'web', {
        name: reason.name,
        error: reason.message,
      });
    });
  }
}
