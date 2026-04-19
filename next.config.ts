import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel: no output: "export" — enables Route Handlers / serverless functions
  // No basePath — app is served from the deployment root
  trailingSlash: true,
};

export default nextConfig;
