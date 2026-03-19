import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mozilla/readability", "linkedom"],
};

export default nextConfig;
