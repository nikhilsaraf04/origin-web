/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep better-sqlite3 (native module) external so Next doesn't try to
  // bundle it into the server build; it's required at runtime from
  // node_modules instead.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
