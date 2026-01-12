/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // 允许所有 supabase.co 的子域名
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com', // 允许头像服务
      },
    ],
  },
};

export default nextConfig;