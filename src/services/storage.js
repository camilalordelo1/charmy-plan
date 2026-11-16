// Preserve the existing key so previously saved calendars remain available.
const STORAGE_KEY = "charmy-dec2026-v1";

export function loadPosts(fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

export function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}
