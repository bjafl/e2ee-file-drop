import { Config, Context } from "@netlify/edge-functions";
import { getSession, saveSession } from "./lib/netlifyBlob";

export default async (request: Request, context: Context) => {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }
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

  // Mark as downloaded
  session.status = "downloaded";
  const result = await saveSession(sessionId, session);

  if (result === null) {
    return new Response(JSON.stringify({ error: "Could not update session" }), {
      status: 500,
    });
  }

  return new Response(
    JSON.stringify({
      message: "Session marked as downloaded",
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
  path: "/api/download-complete/:sessionId",
  method: "GET",
};
