/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    TZ: "Asia/Kolkata", // set Node timezone to IST
  },
};
 
export default nextConfig;