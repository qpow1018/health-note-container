import { getGoogleSignInUrl } from '@/api/auth';

export async function signInWithGoogle() {
  const url = await getGoogleSignInUrl(`${window.location.origin}/`);
  if (!url) return 'unavailable';
  window.location.assign(url);
  return 'redirecting';
}
