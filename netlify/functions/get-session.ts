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

export default async (request: Request) => {
  const pattern = new URLPattern('/api/get-session/:sessionId');
  const match = pattern.exec(request.url);
  const sessionId = match?.pathname.groups.sessionId;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Missing sessionId in URL' }), {
      status: 400,
    });
  }

  const store = getStore('sessions');
  const session = await store.get(sessionId, { type: 'json' }) as Session | null;

  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), { 
      status: 404,
    });
  }

  // Check expiry
  if (Date.now() > session.expiresAt) {
    await store.delete(sessionId);
    return new Response(JSON.stringify({ error: 'Session expired' }), {
      status: 410,
    });
  }

  return new Response(JSON.stringify({
    publicKey: session.publicKey,
    status: session.status,
    fileName: session.fileName,
    fileSize: session.fileSize
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
};

export const config: Config = {
  path: "/api/get-session/:sessionId",
  method: "GET",
};