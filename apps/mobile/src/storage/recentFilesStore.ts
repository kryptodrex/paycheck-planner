import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_FILES_KEY = 'pp-recent-files-v1';
const MAX_RECENT = 10;

export interface RecentFile {
  uri: string;
  name: string;
  lastOpenedAt: string;
  planId: string;
  planName?: string;
  planYear?: number;
  /** Original picked document (cloud/provider URI) that saves are mirrored back to. */
  sourceUri?: string;
}

export async function getRecentFiles(): Promise<RecentFile[]> {
  try {
    const json = await AsyncStorage.getItem(RECENT_FILES_KEY);
    if (!json) return [];
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as RecentFile[]) : [];
  } catch {
    return [];
  }
}

export async function addRecentFile(file: RecentFile): Promise<void> {
  try {
    const existing = await getRecentFiles();
    const deduped = existing.filter((f) => f.uri !== file.uri && f.planId !== file.planId);
    const updated = [file, ...deduped].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
  } catch {
    // Recents are best-effort; ignore storage failures.
  }
}

export async function removeRecentFile(uri: string): Promise<void> {
  try {
    const existing = await getRecentFiles();
    const updated = existing.filter((f) => f.uri !== uri);
    await AsyncStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
  } catch {
    // Recents are best-effort; ignore storage failures.
  }
}

export async function clearRecentFiles(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_FILES_KEY);
}
