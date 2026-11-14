import type { NextConfig } from "next";

// NEXT_OUTPUT=export produces a static site (out/) that the FastAPI backend serves from the same origin in
// production, so the session cookie, the event stream and the sign-in WebSocket never cross sites.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: process.env.NEXT_OUTPUT === "export" ? "export" : undefined,
  trailingSlash: true,
};

export default nextConfig;
