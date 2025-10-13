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

export default async function handler(request: Request){//}, context: Context) {
  if (request.method !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { publicKey } = await request.json();
  
  if (!publicKey) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing publicKey' }) };
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

  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ sessionId })
  };
};

export const config: Config = {
  path: "/api/create-session", 
  method: "POST",
};