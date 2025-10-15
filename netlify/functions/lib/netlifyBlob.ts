import { getStore, Store } from "@netlify/blobs";
import type { Session } from "./types";
import { deleteFromBucket } from "./b2";

let sessionStore: Store | null = null;

export function getSessionStore() {
  if (!sessionStore) {
    sessionStore = getStore("sessions");
  }
  return sessionStore;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const store = getSessionStore();
  try {
  const session = (await store.get(sessionId, {
    type: "json",
  })) as Session | null;
  return session;
  } catch (error) {
    console.error(`Error getting session ${sessionId}:`, error);
    return null;
  }
}

export async function saveSession(
  sessionId: string,
  session: Session
) {
  try {
    const store = getSessionStore();
    return await store.set(sessionId, JSON.stringify(session));
  } catch (error) {
    console.error(`Error saving session ${sessionId}:`, error);
    return null;
  }
}

export async function deleteSession(
  sessionId: string,
  cleanupB2 = true,
  s3Key?: string
): Promise<{ b2Deleted: boolean; sessionDeleted: boolean }> {
  const store = getSessionStore();
  let b2Deleted = false;
  let sessionDeleted = false;
  if (cleanupB2) {
    try {
      if (!s3Key) {
        s3Key = (await getSession(sessionId))?.s3Key;
      }
      if (!s3Key) {
        throw new Error("No s3Key found for session");
      }
      await deleteFromBucket(s3Key);
      b2Deleted = true;
    } catch (error) {
      console.error(`Error deleting ${s3Key}:`, error);
    }
  }
  try {
    await store.delete(sessionId);
    sessionDeleted = true;
  } catch (error) {
    console.error(`Error deleting session ${sessionId}:`, error);
  }
  return { b2Deleted, sessionDeleted };
}

export async function deleteExpiredSessions(cleanupB2 = true): Promise<number> {
  const store = getSessionStore();
  const allBlobs = await store.list();
  const blobKeys = allBlobs.blobs.map((blob) => blob.key);
  let deletedCount = 0;
  blobKeys.forEach(async (key) => {
    const blob = await getSession(key);
    if (blob && (blob.expiresAt < Date.now() || !blob.expiresAt)) {
      const { sessionDeleted } = await deleteSession(key, cleanupB2, blob.s3Key);
      if (sessionDeleted) {
        deletedCount++;
      }
    }
  });
  return deletedCount;
}
