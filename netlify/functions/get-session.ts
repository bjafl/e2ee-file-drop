import { Config } from '@netlify/edge-functions';
import { getStore } from '@netlify/blobs';

interface Session {
  publicKey: string;
  expiresAt: number;
  status: 'waiting' | 'uploaded' | 'downloaded';
  s3Key?: string;
  fileSize?: number;
  fileName?: string;
}

export default async function handler(request: Request) {
  const pattern = new URLPattern('/api/get-session/:sessionId');
  const match = pattern.exec(request.url);
  const sessionId = match?.pathname.groups.sessionId;

  if (!sessionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing sessionId in URL" }),
    };
  }

  const store = getStore('sessions');
  const session = await store.get(sessionId, { type: 'json' }) as Session | null;

  if (!session) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Session not found' }) };
  }

  // Check expiry
  if (Date.now() > session.expiresAt) {
    await store.delete(sessionId);
    return { statusCode: 410, body: JSON.stringify({ error: 'Session expired' }) };
  }

  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      publicKey: session.publicKey,
      status: session.status,
      fileName: session.fileName,
      fileSize: session.fileSize
    })
  };
};

export const config: Config = {
  path: "/api/get-session/:sessionId",
  method: "GET",
};