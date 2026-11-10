import { UserProfile } from '../types';

const PROFILES_STORAGE_KEY = 'tennis_ai_user_profiles';
const ACTIVE_USER_ID_KEY = 'tennis_ai_active_user_id';

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user_sanjay_shankar',
    name: 'Sanjay Shankar',
    handedness: 'Right',
    play_style: 'Aggressive Baseliner',
    utr_rating: '9.5',
  },
  {
    id: 'user_alex_morgan',
    name: 'Alex Morgan',
    handedness: 'Left',
    play_style: 'All-Court Player',
    utr_rating: '8.0',
  },
];

export function loadUserProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load user profiles from localStorage:', err);
  }
  // Initialize with defaults if none exist
  saveUserProfiles(DEFAULT_USERS);
  return DEFAULT_USERS;
}

export function saveUserProfiles(profiles: UserProfile[]): void {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.warn('Failed to save user profiles to localStorage:', err);
  }
}

export function getActiveUserId(): string {
  try {
    const active = localStorage.getItem(ACTIVE_USER_ID_KEY);
    if (active) return active;
  } catch (err) {
    console.warn('Failed to read active user ID:', err);
  }
  return DEFAULT_USERS[0].id;
}

export function setActiveUserId(userId: string): void {
  try {
    localStorage.setItem(ACTIVE_USER_ID_KEY, userId);
  } catch (err) {
    console.warn('Failed to save active user ID:', err);
  }
}

export function getActiveUserProfile(): UserProfile {
  const profiles = loadUserProfiles();
  const activeId = getActiveUserId();
  const match = profiles.find((p) => p.id === activeId);
  return match || profiles[0] || DEFAULT_USERS[0];
}

export function addUserProfile(profile: UserProfile): UserProfile[] {
  const profiles = loadUserProfiles();
  const existingIdx = profiles.findIndex((p) => p.id === profile.id);
  let updated: UserProfile[];
  if (existingIdx >= 0) {
    updated = [...profiles];
    updated[existingIdx] = profile;
  } else {
    updated = [...profiles, profile];
  }
  saveUserProfiles(updated);
  setActiveUserId(profile.id);

  // Sync to server profile endpoint asynchronously
  try {
    fetch(`/api/users/${profile.id}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    }).catch(() => {});
  } catch {
    // Ignore server sync failure in offline mode
  }

  return updated;
}
