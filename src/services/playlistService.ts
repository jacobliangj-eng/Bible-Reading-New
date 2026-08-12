import { PlaylistItem } from '../types';

const PLAYLIST_STORAGE_KEY = 'bible_app_playlist';

export function getPlaylist(): PlaylistItem[] {
  try {
    const raw = localStorage.getItem(PLAYLIST_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PlaylistItem[];
  } catch (err) {
    console.error('Failed to load playlist:', err);
    return [];
  }
}

export function savePlaylist(items: PlaylistItem[]): void {
  try {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save playlist:', err);
  }
}

export function addToPlaylist(item: Omit<PlaylistItem, 'id' | 'createdAt'>): PlaylistItem[] {
  const current = getPlaylist();
  const newItem: PlaylistItem = {
    ...item,
    id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
  };
  const updated = [...current, newItem];
  savePlaylist(updated);
  return updated;
}

export function removeFromPlaylist(id: string): PlaylistItem[] {
  const current = getPlaylist();
  const updated = current.filter((item) => item.id !== id);
  savePlaylist(updated);
  return updated;
}

export function movePlaylistItem(id: string, direction: 'up' | 'down'): PlaylistItem[] {
  const current = getPlaylist();
  const index = current.findIndex((item) => item.id === id);
  if (index < 0) return current;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= current.length) return current;

  const updated = [...current];
  const [movedItem] = updated.splice(index, 1);
  updated.splice(targetIndex, 0, movedItem);

  savePlaylist(updated);
  return updated;
}

export function clearPlaylist(): PlaylistItem[] {
  savePlaylist([]);
  return [];
}
