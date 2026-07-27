import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // stellar-sdk pulls in some node builtins; keep it external on the server.
  serverExternalPackages: ["@stellar/stellar-sdk"],
};

export default nextConfig;
