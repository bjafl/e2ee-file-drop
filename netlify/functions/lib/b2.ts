import { S3Client } from "@aws-sdk/client-s3";

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
