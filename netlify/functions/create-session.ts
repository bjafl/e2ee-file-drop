import { nanoid } from "nanoid";
import type { Config } from "@netlify/edge-functions";
import type { Session } from "./lib/types";
import { SESSION_LENGTH } from "./lib/const";
import { saveSession } from "./lib/netlifyBlob";

export default async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { publicKey } = await request.json();

  if (!publicKey) {
    return new Response(
      JSON.stringify({ error: "Request missing publicKey" }),
      { status: 400 }
    );
  }

  const sessionId = nanoid(16);
  const expiresAt = Date.now() + SESSION_LENGTH;
  const session: Session = {
    recipientPublicKey: publicKey,
    expiresAt,
    status: "waiting",
  };

  const result = await saveSession(sessionId, session);
  if (result === null) {
    return new Response(JSON.stringify({ error: "Could not create session" }), {
      status: 500,
    });
  }
  return new Response(JSON.stringify({ sessionId }), {
    headers: {
      "Content-Type": "application/json",
      // "Access-Control-Allow-Origin": "*"
    },
  });
};

export const config: Config = {
  path: "/api/create-session",
  method: "POST",
};
