import { Config, Context } from "@netlify/edge-functions";
import { nanoid } from "nanoid";
import type { UploadUrlPayload } from "./lib/types";
import {  getSignedUploadUrl } from "./lib/b2";
import { getSession, saveSession } from "./lib/netlifyBlob";
import { MAX_FILE_SIZE } from "./lib/const";

export default async (request: Request, context: Context) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const sessionId = context.params?.sessionId;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing sessionId in URL" }), {
      status: 400,
    });
  }

  const {
    senderPublicKey,
    uploadComplete = false,
    metadata,
  } = (await request.json()) as UploadUrlPayload;

  const session = await getSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
    });
  }

  // Handle upload complete update
  if (uploadComplete) {
    session.status = "uploaded";
    const result = await saveSession(sessionId, session);
    if (result === null) {
      return new Response(
        JSON.stringify({ error: "Could not update session status" }),
        {
          status: 500,
        }
      );
    }
    return new Response(
      JSON.stringify({
        message: "Session updated to uploaded",
      }),
      { status: 200 }
    );
  }

  // Process upload url request

  if (
    !senderPublicKey ||
    !metadata ||
    !metadata.fileName ||
    !metadata.fileSize ||
    !metadata.nonce ||
    !metadata.mimeType ||
    !metadata.contentSHA256
  ) {
    return new Response(JSON.stringify({ error: "Missing metadata" }), {
      status: 400,
    });
  }

  const { fileName, fileSize, nonce, mimeType, contentSHA256 } = metadata;
 

  // Size limit
  if (fileSize > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({
        error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      }),
      { status: 413 }
    );
  } 

 const fileId = nanoid(16);
  const s3Key = `${sessionId}/${fileId}`;

  session.s3Key = s3Key;
  session.status = "uploading";
  session.senderPublicKey = senderPublicKey;
  session.fileName = fileName;
  session.fileSize = fileSize;
  session.nonce = nonce;
  session.mimeType = mimeType;
  session.contentSHA256 = contentSHA256;

  const result = await saveSession(sessionId, session);
  if (result === null) {
    return new Response(JSON.stringify({ error: "Could not update session" }), {
      status: 500,
    });
  }

  let uploadUrl: string;
  try {
    uploadUrl = await getSignedUploadUrl(session);
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return new Response(
      JSON.stringify({ error: "Could not create upload URL" }),
      {
        status: 500,
      }
    );
  }
  // Update session
  session.s3Key = s3Key;
  session.fileSize = fileSize;
  session.fileName = fileName;
  session.status = "uploading";
  session.senderPublicKey = senderPublicKey;
  session.nonce = nonce;
  session.mimeType = mimeType;

  return new Response(JSON.stringify({ uploadUrl, status: session.status }), {
    headers: {
      "Content-Type": "application/json",
      // 'Access-Control-Allow-Origin': '*',
    },
  });
};

export const config: Config = {
  path: "/api/get-upload-url/:sessionId",
  method: "POST",
};
