import { getStore, Store } from "@netlify/blobs";
import type { Session } from "./types";

let sessionStore: Store | null = null;

export function getSessionStore() {
  if (!sessionStore) {
    sessionStore = getStore("sessions");
  }
  return sessionStore;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const store = getSessionStore();
  const session = (await store.get(sessionId, {
    type: "json",
  })) as Session | null;
  return session;
}

export async function saveSession(sessionId: string, session: Session): Promise<void> {
  const store = getSessionStore();
  await store.set(sessionId, JSON.stringify(session));
}

export async function deleteSession(sessionId: string): Promise<void> {
  const store = getSessionStore();
  await store.delete(sessionId);
}

export async function deleteExpiredSessions(): Promise<number> {
  const store = getSessionStore();
  const allBlobs = await store.list();
  const blobKeys = allBlobs.blobs.map(blob => blob.key);
  let deletedCount = 0;
  blobKeys.forEach(async (key) => {
    const blob = await getSession(key);
    if (blob && (blob.expiresAt < Date.now() || !blob.expiresAt)) {
      await store.delete(key);
      deletedCount++;
    }
  });
  return deletedCount;
}
