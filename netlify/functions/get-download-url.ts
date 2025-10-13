import { Config } from '@netlify/edge-functions';
import { getStore } from '@netlify/blobs';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const b2 = new S3Client({
  region: process.env.B2_REGION!,
  endpoint: process.env.B2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!
  }
});

interface Session {
  publicKey: string;
  expiresAt: number;
  status: 'waiting' | 'uploaded' | 'downloaded';
  s3Key?: string;
  fileSize?: number;
  fileName?: string;
}
export default async function handler(request: Request) {
  const pattern = new URLPattern('/api/get-download-url/:sessionId');
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

  if (!session || session.status !== 'uploaded') {
    return { 
      statusCode: 404, 
      body: JSON.stringify({ error: 'No file available' }) 
    };
  }

  // Generate presigned GET URL (10 min expiry)
  const downloadUrl = await getSignedUrl(
    b2,
    new GetObjectCommand({
      Bucket: process.env.B2_BUCKET!,
      Key: session.s3Key!
    }),
    { expiresIn: 600 }
  );

  // Mark as downloaded
  session.status = 'downloaded';
  await store.setJSON(sessionId, session);

  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      downloadUrl,
      fileSize: session.fileSize,
      fileName: session.fileName
    })
  };
};

export const config: Config = {
  path: "/api/get-download-url/:sessionId",
  method: "GET",
};