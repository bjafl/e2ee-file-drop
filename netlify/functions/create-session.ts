import { getStore } from '@netlify/blobs';
import { nanoid } from 'nanoid';
import type { Config } from "@netlify/edge-functions";
interface Session {
  publicKey: string;
  expiresAt: number;
  status: 'waiting' | 'uploaded' | 'downloaded';
  s3Key?: string;
  fileSize?: number;
  fileName?: string;
}

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { publicKey } = await request.json();
  
  if (!publicKey) {
    return new Response(JSON.stringify({ error: 'Missing publicKey' }), { status: 400 });
  }

  const sessionId = nanoid(16);
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24h

  const session: Session = {
    publicKey,
    expiresAt,
    status: 'waiting'
  };

  // Store in Netlify Blob
  const store = getStore('sessions');
  await store.setJSON(sessionId, session);

  return new Response(JSON.stringify({ sessionId }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
};

export const config: Config = {
  path: "/api/create-session", 
  method: "POST",
};