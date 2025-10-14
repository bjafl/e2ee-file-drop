import { Config, Context } from "@netlify/edge-functions";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getBucketClient } from "./lib/b2";
import { getSession, saveSession } from "./lib/netlifyBlob";

export default async (request: Request, context: Context) => {
  const sessionId = context.params?.sessionId;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing sessionId in URL" }), {
      status: 400,
    });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: "Could not find session" }), {
      status: 404,
    });
  }
  if (session.status == "waiting" || session.status == "uploading") {
    return new Response(JSON.stringify({ error: "File not ready for download" }), {
      status: 403,
    });
  }

  // Generate presigned GET URL (10 min expiry)
  const b2 = getBucketClient();
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
  await saveSession(sessionId, session); //TODO: add downloading state?

  return new Response(
    JSON.stringify({
      downloadUrl,
      fileSize: session.fileSize,
      fileName: session.fileName,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        // "Access-Control-Allow-Origin": "*",
      },
    }
  );
};

export const config: Config = {
  path: "/api/get-download-url/:sessionId",
  method: "GET",
};
