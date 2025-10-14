import { Config, Context } from "@netlify/edge-functions";
import { deleteSession, getSession } from "./lib/netlifyBlob";

export default async function handler(request: Request, context: Context) {
  const sessionId = context.params?.sessionId;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing sessionId in URL" }), {
      status: 400,
    });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
    });
  }

  // Check expiry
  if (Date.now() > session.expiresAt) {
    await deleteSession(sessionId);
    return new Response(JSON.stringify({ error: "Session expired" }), {
      status: 410,
    });
  }

  return new Response(
    JSON.stringify({
      recipientPublicKey: session.recipientPublicKey,
      status: session.status,
      senderPublicKey: session.senderPublicKey,
      nonce: session.nonce,
      mimeType: session.mimeType,
      fileName: session.fileName,
      fileSize: session.fileSize,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        // "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export const config: Config = {
  path: "/api/get-session/:sessionId",
  method: "GET",
};
