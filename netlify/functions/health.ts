import { Config } from '@netlify/edge-functions';

export default async (request: Request) => {
  console.log("Health check", request);
  return new Response('Online', { status: 200 });
}

export const config: Config = {
  path: "/api/health",
  method: "GET",
};