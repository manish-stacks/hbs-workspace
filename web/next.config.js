const path = require("path");

const sec = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: false,
  transpilePackages: ["recharts"],
  ...(process.env.BUILD_STANDALONE === "true" ? {
    output: "standalone",
    experimental: { outputFileTracingRoot: path.join(__dirname, "../") }
  } : {}),
  async headers() {
    return [{ source: "/(.*)", headers: sec }];
  }
};

module.exports = nextConfig;
