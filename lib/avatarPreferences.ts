const avatarIds = ['spider-man', 'batman', 'jake', 'random'] as const;

export type AvatarId = (typeof avatarIds)[number];

let cachedAvatarId: AvatarId | null | undefined;
let cachedAuthenticated: boolean | null = null;
let avatarRequestPromise: Promise<AvatarId | null> | null = null;

export function getAvatarById(avatarId: AvatarId | null | undefined) {
  if (!avatarId) return avatarIds[0];
  return avatarIds.find((id) => id === avatarId) ?? avatarIds[0];
}

export function getCachedAvatarId() {
  return cachedAvatarId;
}

export function setCachedAvatarId(avatarId: AvatarId | null) {
  cachedAvatarId = avatarId;
}

export function getCachedAuthenticated() {
  return cachedAuthenticated;
}

export async function fetchAvatarPreference(): Promise<{ avatarId: AvatarId | null; isAuthenticated: boolean }> {
  if (cachedAuthenticated !== null) {
    return { avatarId: cachedAvatarId ?? null, isAuthenticated: cachedAuthenticated };
  }

  if (avatarRequestPromise) {
    return avatarRequestPromise.then((avatarId) => ({
      avatarId,
      isAuthenticated: cachedAuthenticated ?? false,
    }));
  }

  avatarRequestPromise = fetch('/api/auth/avatar')
    .then(async (response) => {
      if (!response.ok) {
        cachedAuthenticated = false;
        cachedAvatarId = null;
        return null;
      }

      const data = await response.json().catch(() => ({}));
      const avatarId =
        typeof data?.avatarId === 'string' && avatarIds.includes(data.avatarId as AvatarId)
          ? (data.avatarId as AvatarId)
          : 'spider-man';

      cachedAuthenticated = true;
      cachedAvatarId = avatarId;
      return avatarId;
    })
    .finally(() => {
      avatarRequestPromise = null;
    });

  return avatarRequestPromise.then((avatarId) => ({
    avatarId,
    isAuthenticated: cachedAuthenticated ?? false,
  }));
}

export function setAuthenticatedState(isAuthenticated: boolean) {
  cachedAuthenticated = isAuthenticated;
}
