import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { queryClient } from '@/lib/query/queryClient';
import { supabase } from '@/lib/supabase';
import { setCurrentUserId } from '@/lib/auth/currentUser';

type TAuthState = {
  session: Session | null;
  isLoading: boolean;
  error: string;
};

export function useAuthSession() {
  const [state, setState] = useState<TAuthState>({
    session: null,
    isLoading: Boolean(supabase),
    error: supabase ? '' : '로그인 연결 설정이 필요해요.',
  });

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const auth = client.auth;

    let isMounted = true;
    let hasAuthEvent = false;

    function updateSession(session: Session | null, error = '') {
      if (!isMounted) return;
      if (setCurrentUserId(session?.user.id ?? null)) queryClient.clear();
      setState({ session, isLoading: false, error });
    }

    const { data } = auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      hasAuthEvent = true;
      updateSession(session);
    });

    async function restoreSession() {
      try {
        const initialized = await auth.initialize();
        if (initialized.error) throw initialized.error;
        const { data, error } = await auth.getSession();
        if (error) throw error;
        if (!hasAuthEvent) updateSession(data.session);
      } catch {
        if (!hasAuthEvent) {
          updateSession(null, '로그인을 완료하지 못했어요. 다시 시도해 주세요.');
        }
      }
    }

    void restoreSession();
    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
