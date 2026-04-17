import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for GitHub Pages
  output: "export",
  
  // GitHub Pages is served from /knowledge-hub subdirectory
  basePath: "/knowledge-hub",
  
  // Ensure trailing slashes for static export compatibility
  trailingSlash: true,
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
