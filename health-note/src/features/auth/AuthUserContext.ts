import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';

type TAuthUserContext = {
  user: User;
  nickname: string;
};

export const AuthUserContext = createContext<TAuthUserContext | null>(null);
