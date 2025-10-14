// netlify/functions/cleanup-blobs.ts
import type { Config } from "@netlify/functions";
import { deleteExpiredSessions } from "./lib/netlifyBlob";

export default async () => {
  const deletedCount = await deleteExpiredSessions();
  console.log(`Deleted ${deletedCount} expired sessions.`);
  return new Response(JSON.stringify({ deleted: deletedCount }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

export const config: Config = {
  schedule: "0 2 * * *" // Daily at 2 AM UTC
};