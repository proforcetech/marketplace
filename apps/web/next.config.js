/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Proxy /api/v1/* to the NestJS backend in all environments.
  // Avoids CORS issues in dev and keeps the frontend origin-relative.
  async rewrites() {
    const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
  transpilePackages: ['@marketplace/ui', '@marketplace/shared', 'mapbox-gl'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.marketplace.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
};

module.exports = nextConfig;
