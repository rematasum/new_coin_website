/** @type {import('next').NextConfig} */
const nextConfig = {
  // Node.js server mode (remove "output: export" for dynamic rendering)
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
