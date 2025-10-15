import { Config, Context } from "@netlify/edge-functions";
import { getSession, saveSession } from "./lib/netlifyBlob";
import { getSignedDownloadUrl } from "./lib/b2";

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
  const { s3Key, status } = session;
  if (!s3Key) {
    return new Response(JSON.stringify({ error: "No uploaded file found for this session" }), {
      status: 404,
    });
  }
  if (status == "waiting" || status == "uploading") {
    return new Response(
      JSON.stringify({ error: "File not ready for download" }),
      {
        status: 403,
      }
    );
  }

  // Generate presigned GET URL (10 min expiry)
  let downloadUrl: string;
  try {
    downloadUrl = await getSignedDownloadUrl(s3Key);
  } catch (error) {
    console.error("Error generating download URL:", error);
    return new Response(
      JSON.stringify({ error: "Error generating download URL" }),
      {
        status: 500,
      }
    );
  }

  // Mark as downloading
  session.status = "downloading";
  const result = await saveSession(sessionId, session);
  if (result === null) {
    return new Response(JSON.stringify({ error: "Could not mark session as downloading" }), {
      status: 500,
    });
  }

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
