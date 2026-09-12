import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unpdf ships its own serverless-friendly build; keep it external so the
  // Next.js bundler does not try to inline its worker files.
  serverExternalPackages: ["unpdf"],
};

export default nextConfig;
