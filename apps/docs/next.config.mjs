/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The @harf/* packages are workspace links built by turbo before this runs,
  // so nothing needs transpiling — but listing them makes a source-map trace
  // point at the real file when something goes wrong.
  transpilePackages: [],
};

export default nextConfig;
