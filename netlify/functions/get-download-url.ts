import { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const b2 = new S3Client({
  region: process.env.B2_REGION!,
  endpoint: process.env.B2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED'
});

interface Session {
  senderPublicKey?: string;
  recipientPublicKey: string;
  expiresAt: number;
  status: 'waiting' | 'uploading' | 'uploaded' | 'downloaded';
  nonce?: string;
  mimeType?: string;
  s3Key?: string;
  fileSize?: number;
  fileName?: string;
}
export default async (request: Request, context: Context) => {
  const sessionId = context.params?.sessionId;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing sessionId in URL" }), {
      status: 400,
    });
  }

  const store = getStore("sessions");
  const session = (await store.get(sessionId, {
    type: "json",
  })) as Session | null;

  if (!session || session.status !== "uploaded") {
    return new Response(JSON.stringify({ error: "No file available" }), {
      status: 404,
    });
  }

  // Generate presigned GET URL (10 min expiry)
  const downloadUrl = await getSignedUrl(
    b2,
    new GetObjectCommand({
      Bucket: process.env.B2_BUCKET!,
      Key: session.s3Key!,
    }),
    { expiresIn: 600 }
  );

  // Mark as downloaded
  session.status = "downloaded";
  await store.setJSON(sessionId, session);

  return new Response(
    JSON.stringify({
      downloadUrl,
      fileSize: session.fileSize,
      fileName: session.fileName,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
};

export const config: Config = {
  path: "/api/get-download-url/:sessionId",
  method: "GET",
};
