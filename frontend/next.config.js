/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export → produces /out folder for cPanel / static hosting.
  output: "export",
  // cPanel/Apache serves /page as /page/index.html only with trailing slash.
  trailingSlash: true,
  // Static export has no Next.js image optimization server.
  images: { unoptimized: true },
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    // Wagmi / MetaMask SDK pull in optional deps that only exist in
    // React Native — mark them as externals so the build doesn't warn.
    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      "@react-native-async-storage/async-storage",
    );
    return config;
  },
};

export default nextConfig;
