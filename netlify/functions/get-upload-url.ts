import { Config, Context } from '@netlify/edge-functions';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import type { UploadUrlPayload } from './lib/types';
import { getBucketClient } from './lib/b2';
import { getSession, saveSession, updateSession } from './lib/netlifyBlob';
import { MAX_FILE_SIZE } from './lib/const';

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

  const { senderPublicKey, uploadComplete = false, metadata } =
    (await request.json()) as UploadUrlPayload;

  // Handle upload complete update

  if (uploadComplete) {
    try {
      updateSession(sessionId, { status: 'uploaded' });
      const newVal = await getSession(sessionId); // todo: remove
      return new Response(
        JSON.stringify({ message: `Session updated to ${newVal?.status || "null"}` }),
        { status: 200 }
      );
    } catch (error) {
      console.error('Error updating session:', error);
      return new Response(JSON.stringify({ error: 'Failed to update session' }), {
        status: 500,
      });
    }
  }

  // Process upload url request

  if (!senderPublicKey || !metadata || !metadata.fileName || !metadata.fileSize || !metadata.nonce || !metadata.mimeType) {
    return new Response(JSON.stringify({ error: 'Missing metadata' }), {
      status: 400,
    });
  }
  
  const { fileName, fileSize, nonce, mimeType } = metadata;
  const session = await getSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
    });
  }
  
  // Size limit
  if (fileSize > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({
        error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      }),
      { status: 413 }
    );
  } //TODO: restrict upload size on b2

  const fileId = nanoid(16);
  const s3Key = `${sessionId}/${fileId}`;

  // Generate presigned PUT URL (10 min expiry)
  const b2 = getBucketClient();
  const uploadUrl = await getSignedUrl(
    b2,
    new PutObjectCommand({
      Bucket: process.env.B2_BUCKET!,
      Key: s3Key,
      ContentType: 'application/octet-stream',
    }),
    {
      expiresIn: 600,
      unhoistableHeaders: new Set(['content-length']), // TODO: also sign content-length to enforce size limit
      signableHeaders: new Set(['content-type']), // Include content-type in signature
    }
  );

  // Update session
  session.s3Key = s3Key;
  session.fileSize = fileSize;
  session.fileName = fileName;
  session.status = 'uploading';
  session.senderPublicKey = senderPublicKey;
  session.nonce = nonce;
  session.mimeType = mimeType;

  await saveSession(sessionId, session);

  return new Response(JSON.stringify({ uploadUrl, status: session.status }), {
    headers: {
      'Content-Type': 'application/json',
      // 'Access-Control-Allow-Origin': '*',
    },
  });
};

export const config: Config = {
  path: '/api/get-upload-url/:sessionId',
  method: 'POST',
};
