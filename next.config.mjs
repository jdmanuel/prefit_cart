/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets the e2e server run alongside `npm run dev` without sharing a build folder.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  compiler: { styledComponents: true },
  // Saved Exa responses are read with fs at runtime, so ship them with the API function.
  outputFileTracingIncludes: { '/api/profile': ['./data/cache/**'] },
};

export default nextConfig;
