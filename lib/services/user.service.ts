import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface PublicUser {
  id:        string
  username:  string
  email:     string
  createdAt: string
}

function toPublic(u: { id: string; username: string; email: string; createdAt: Date }): PublicUser {
  return { id: u.id, username: u.username, email: u.email, createdAt: u.createdAt.toISOString() }
}

export const userService = {
  async create(username: string, email: string, password: string): Promise<PublicUser> {
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { username: username.trim().toLowerCase(), email: email.trim().toLowerCase(), passwordHash },
    })
    logger.info('AUTH', 'Utilizador criado', { userId: user.id, username: user.username })
    return toPublic(user)
  },

  async findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } })
  },

  async findById(id: string): Promise<PublicUser | null> {
    const user = await prisma.user.findUnique({ where: { id } })
    return user ? toPublic(user) : null
  },

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  },

  async existsByUsername(username: string): Promise<boolean> {
    const u = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() }, select: { id: true } })
    return u !== null
  },

  async existsByEmail(email: string): Promise<boolean> {
    const u = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } })
    return u !== null
  },
}
