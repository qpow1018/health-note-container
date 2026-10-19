let userId: string | null = null;

export function setCurrentUserId(id: string | null) {
  const isChanged = userId !== id;
  userId = id;
  return isChanged;
}

export function getUserKey(key: string) {
  return `${key}:${getCurrentUserId()}`;
}

export function getCurrentUserId() {
  if (!userId) throw new Error('로그인이 필요해요.');
  return userId;
}
