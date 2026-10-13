import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
];

// ALPHA_API_URL is read at request time (src/lib/server/backend.ts), so a build may run without it,
// but a production server without it refuses backend requests. Make that visible in deployment logs.
if (process.env.NODE_ENV === "production" && !process.env.ALPHA_API_URL?.trim()) {
  console.warn("ALPHA_API_URL is not set: the production server will answer backend requests with 503 until it is configured.");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
