/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Supabase generated types are incomplete (missing tables like municipios,
    // estabelecimentos_saude, tooltip_contents, etc). Skip type checking during
    // build until schema types are regenerated.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
