/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // static SPA — served by Apache at admin.bharatherbs.in
  images: { unoptimized: true },
  trailingSlash: true, // folder/index.html per route so Apache serves deep links
};
export default nextConfig;
