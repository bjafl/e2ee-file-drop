import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Session } from "./types";

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

export async function getSignedUploadUrl(session: Session, expiresIn=600) {
  const b2 = getBucketClient();
  const command = new PutObjectCommand({
      Bucket: process.env.B2_BUCKET!,
      Key: session.s3Key!,
      ContentType: "application/octet-stream",
      ContentLength: session.fileSize,
      ContentMD5: session.contentMD5,
      Metadata: {
        fileName: session.fileName || "",
        nonce: session.nonce || "",
        publicKey: session.senderPublicKey || "",
        mimeType: session.mimeType || "",
      },
  });
  const url = await getSignedUrl(
    b2,
    command,
    {
      expiresIn,
      hoistableHeaders: new Set([
        "Content-Type",
        "Content-Length",
        "Content-MD5",
        "X-Amz-Meta-FileName",
        "X-Amz-Meta-Nonce",
        "X-Amz-Meta-PublicKey",
        "X-Amz-Meta-MimeType",
      ]), // Include content-type in signature
    }
  );
  return url;
}

export async function getSignedDownloadUrl(s3Key: string, expiresIn=600) {
  const b2 = getBucketClient();
  const command = new GetObjectCommand({
      Bucket: process.env.B2_BUCKET!,
      Key: s3Key
  });
  const url = await getSignedUrl(
    b2,
    command,
    {
      expiresIn,
    }
  );
  return url;
}