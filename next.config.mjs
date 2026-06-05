/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.suno.com' },
      { protocol: 'https', hostname: '**.suno.ai' },
      { protocol: 'https', hostname: 'cdn1.suno.ai' },
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ]
  },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' }
  }
};

export default nextConfig;
