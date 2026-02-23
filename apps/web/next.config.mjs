/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gmflpmcepempcygdrayv.supabase.co',
      },
    ],
  },
  // Transpile packages that need it
  transpilePackages: ['lucide-react'],
};

export default nextConfig;
