import {
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from './firebase';

export interface ProgressRecord {
  uid: string;
  itemId: string;
  episodeKey?: string | null;
  position: number;
  duration: number;
  percent: number;
  updatedAt: number;
  completed: boolean;
  itemName?: string;
  thumbnailUrl?: string;
}

const docKey = (uid: string, itemId: string, episodeKey?: string | null) =>
  `${uid}__${itemId}__${episodeKey || 'main'}`;

export async function saveProgress(
  uid: string,
  itemId: string,
  position: number,
  duration: number,
  meta?: { episodeKey?: string | null; itemName?: string; thumbnailUrl?: string }
): Promise<void> {
  if (!uid || !itemId || !Number.isFinite(position) || !Number.isFinite(duration)) return;
  if (duration <= 0) return;
  const percent = Math.min(1, Math.max(0, position / duration));
  const completed = percent >= 0.95;
  const id = docKey(uid, itemId, meta?.episodeKey);
  const payload: ProgressRecord = {
    uid,
    itemId,
    episodeKey: meta?.episodeKey ?? null,
    position: Math.round(position),
    duration: Math.round(duration),
    percent,
    updatedAt: Date.now(),
    completed,
    itemName: meta?.itemName,
    thumbnailUrl: meta?.thumbnailUrl,
  };
  try {
    await setDoc(doc(db, 'userProgress', id), payload, { merge: true });
  } catch (err) {
    console.warn('saveProgress failed', err);
  }
}

export async function getItemProgress(
  uid: string,
  itemId: string,
  episodeKey?: string | null
): Promise<ProgressRecord | null> {
  if (!uid || !itemId) return null;
  try {
    const snap = await getDoc(doc(db, 'userProgress', docKey(uid, itemId, episodeKey)));
    if (!snap.exists()) return null;
    return snap.data() as ProgressRecord;
  } catch (err) {
    console.warn('getItemProgress failed', err);
    return null;
  }
}

export async function clearProgress(
  uid: string,
  itemId: string,
  episodeKey?: string | null
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'userProgress', docKey(uid, itemId, episodeKey)));
  } catch (err) {
    console.warn('clearProgress failed', err);
  }
}

export function subscribeContinueWatching(
  uid: string,
  cb: (records: ProgressRecord[]) => void
): () => void {
  if (!uid) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, 'userProgress'), where('uid', '==', uid));
  const unsub = onSnapshot(
    q,
    (snap) => {
      const records = snap.docs
        .map((d) => d.data() as ProgressRecord)
        .filter((r) => !r.completed && r.percent >= 0.02 && r.percent < 0.95)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      cb(records);
    },
    (err) => {
      console.warn('subscribeContinueWatching error', err);
      cb([]);
    }
  );
  return unsub;
}
