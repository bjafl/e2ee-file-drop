import { Config, Context } from '@netlify/edge-functions';
import { getStore } from '@netlify/blobs';

interface Session {
  senderPublicKey?: string;
  recipientPublicKey: string;
  expiresAt: number;
  status: 'waiting' | 'uploading' | 'uploaded' | 'downloaded';
  nonce?: string;
  mimeType?: string;
  fileSize?: number;
  fileName?: string;
  downloadUrl?: string;
}
interface EncryptedFileMetadata {
  fileName: string;
  fileSize: number;
  nonce: string;
  mimeType: string;
  senderPublicKey: string; // base64
}
interface B2AuthResponse {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
}

interface B2UploadUrlResponse {
  bucketId: string;
  uploadUrl: string;
  authorizationToken: string;
}

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const sessionId = context.params?.sessionId;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Missing sessionId in URL' }), {
      status: 400,
    });
  }

  const { fileSize, fileName, nonce, senderPublicKey, mimeType } =
    (await request.json()) as EncryptedFileMetadata;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
      status: 400,
    });
  }

  const store = getStore('sessions');
  const session = (await store.get(sessionId, {
    type: 'json',
  })) as Session | null;

  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
    });
  }

  // Size limit
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (fileSize > maxSize) {
    return new Response(
      JSON.stringify({
        error: `File too large (max ${maxSize / 1024 / 1024}MB)`,
      }),
      { status: 413 }
    );
  }


    const authString = Buffer.from(`${process.env.B2_KEY_ID!}:${process.env.B2_APPLICATION_KEY!}`).toString('base64');
    const authResponse = await fetch(
      "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${authString}`,
        },
      }
    );

    if (!authResponse.ok) {
      return new Response(JSON.stringify({ error: `B2 authorization failed: ${authResponse.statusText}` }), { status: 500 });
    }

    const authData: B2AuthResponse = await authResponse.json();

    // Step 2: Get upload URL
    const uploadUrlResponse = await fetch(
      `${authData.apiUrl}/b2api/v2/b2_get_upload_url`,
      {
        method: "POST",
        headers: {
          Authorization: authData.authorizationToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bucketId: process.env.B2_BUCKET_ID! }),
      }
    );

    if (!uploadUrlResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to get upload URL' }), { status: 500 });
    }

    const uploadData: B2UploadUrlResponse = await uploadUrlResponse.json();

    const downloadUrl = `${authData.downloadUrl}/file/${process.env.B2_BUCKET!}/${fileName}`;

  // Update session
  session.downloadUrl = downloadUrl;
  session.fileSize = fileSize;
  session.fileName = fileName;
  session.status = 'uploading';
  session.senderPublicKey = senderPublicKey;
  session.nonce = nonce;
  session.mimeType = mimeType;

  await store.setJSON(sessionId, session);

  return new Response(JSON.stringify({ 
        uploadUrl: uploadData.uploadUrl,
        authorizationToken: uploadData.authorizationToken,
        fileName: fileName,
        contentType: mimeType || "b2/x-auto",
      }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

export const config: Config = {
  path: '/api/get-upload-url/:sessionId',
  method: 'POST',
};
