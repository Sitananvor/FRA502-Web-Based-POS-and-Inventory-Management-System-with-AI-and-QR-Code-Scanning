import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  basePath: '/fibo6658/postock',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;