import { Config, Context } from '@netlify/edge-functions';
import { getStore } from "@netlify/blobs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

const b2 = new S3Client({
  region: process.env.B2_REGION!,
  endpoint: process.env.B2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
});

interface Session {
  senderPublicKey?: string;
  recipientPublicKey: string;
  expiresAt: number;
  status: "waiting" | "uploading" | "uploaded" | "downloaded";
  s3Key?: string;
  fileSize?: number;
  fileName?: string;
}
interface EncryptedFileMetadata {
  fileName: string;
  fileSize: number;
  nonce: string;
  mimeType: string;
  senderPublicKey: string; // base64
}
export default async function handler(request: Request, context: Context) {
  if (request.method !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sessionId = context.params?.sessionId;
  const { fileSize, fileName, nonce, senderPublicKey, mimeType } = await request.json() as EncryptedFileMetadata;

  if (!sessionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing sessionId" }),
    };
  }

  const store = getStore("sessions");
  const session = (await store.get(sessionId, {
    type: "json",
  })) as Session | null;

  if (!session) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Session not found" }),
    };
  }

  // Size limit
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (fileSize > maxSize) {
    return {
      statusCode: 413,
      body: JSON.stringify({
        error: `File too large (max ${maxSize / 1024 / 1024}MB)`,
      }),
    };
  }

  const fileId = nanoid(16);
  const s3Key = `${sessionId}/${fileId}`;

  // Generate presigned PUT URL (10 min expiry)
  const uploadUrl = await getSignedUrl(
    b2,
    new PutObjectCommand({
      Bucket: process.env.B2_BUCKET!,
      Key: s3Key,
      ContentType: "application/octet-stream",
      ContentLength: fileSize,
      Metadata: {
        sessionId,
        encrypted: "true",
        mimeType,
        nonce: nonce || "",
        fileName: fileName || "encrypted-file",
      },
    }),
    { expiresIn: 600 }
  );

  // Update session
  session.s3Key = s3Key;
  session.fileSize = fileSize;
  session.fileName = fileName;
  session.status = "uploading";
  session.senderPublicKey = senderPublicKey;

  await store.setJSON(sessionId, session);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      uploadUrl,
      fileId,
    }),
  };
};

export const config: Config = {
  path: "/api/get-upload-url/:sessionId",
  method: "POST",
};
