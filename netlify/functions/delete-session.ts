import { Config, Context } from "@netlify/edge-functions";
import { deleteSession, getSession } from "./lib/netlifyBlob";

export default async (request: Request, context: Context) => {
  if (request.method !== "DELETE") {
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

  const { b2Deleted, sessionDeleted } = await deleteSession(sessionId, true, session.s3Key);
 
  return new Response(
    JSON.stringify({
      b2Deleted,
      sessionDeleted,
    })
  );
};

export const config: Config = {
  path: "/api/delete-session/:sessionId",
  method: "DELETE",
};
