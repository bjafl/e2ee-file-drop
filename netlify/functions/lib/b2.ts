import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSession } from "./netlifyBlob";

let b2: S3Client | null = null;

export function getBucketClient() {
  if (!b2) {
    b2 = new S3Client({
      region: process.env.B2_REGION!,
      endpoint: process.env.B2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.B2_KEY_ID!,
        secretAccessKey: process.env.B2_APPLICATION_KEY!,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }
  return b2;
}
export async function deleteFromBucket(s3Key: string) {
  const b2 = getBucketClient();
  const command = new DeleteObjectCommand({
    Bucket: process.env.B2_BUCKET!,
    Key: s3Key,
  });
  try {
    await b2.send(command);
  } catch (error) {
    console.error(`Error deleting ${s3Key}:`, error);
    throw error;
  }
}

export async function deleteSessionBlobFromBucket(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  if (!session.s3Key) {
    throw new Error("No s3Key found in session");
  }
  await deleteFromBucket(session.s3Key);
}