/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@campus/db", "@campus/shared"],
};

export default nextConfig;
