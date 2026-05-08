/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['stripe', 'bcryptjs'],
  },
}

module.exports = nextConfig
