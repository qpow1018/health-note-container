import { getSupabase } from '@/lib/supabase';

type TAuthSettings = { external?: { google?: boolean } };

export async function getGoogleSignInUrl(redirectTo: string) {
  const settings = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  });
  if (!settings.ok) throw new Error('Auth settings unavailable');
  const config: TAuthSettings = await settings.json();
  if (!config.external?.google) return null;

  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error('Missing login URL');
  return data.url;
}

export async function signOut() {
  return getSupabase().auth.signOut({ scope: 'local' });
}

export async function updateNickname(nickname: string) {
  const { error } = await getSupabase().auth.updateUser({ data: { nickname } });
  if (error) throw error;
}
