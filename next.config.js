/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['stripe', 'bcryptjs'],
  },
}

module.exports = nextConfig
