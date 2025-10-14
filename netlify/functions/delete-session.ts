import { Config, Context } from "@netlify/edge-functions";
import { deleteSessionBlobFromBucket } from "./lib/b2";
import { deleteSession, getSession } from "./lib/netlifyBlob";

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

  deleteSession(sessionId);
 
  try {
    await deleteSessionBlobFromBucket(sessionId);
    console.log(`Successfully deleted ${session.s3Key!}`);
    return new Response(JSON.stringify({ message: "File deleted from server" }), { status: 200 });
  } catch (error) {
    console.error(`Error deleting ${session.s3Key!}:`, error);
    return new Response(JSON.stringify({ error: "Error deleting file from server" }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/get-download-url/:sessionId",
  method: "GET",
};
