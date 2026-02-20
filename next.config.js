/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    trailingSlash: true,
    reactStrictMode: true,
    // Firebase Hosting requires unoptimized images for static export
    images: {
        unoptimized: true,
    },
};

module.exports = nextConfig;
