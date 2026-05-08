import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH  = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) throw new Error('ENCRYPTION_KEY não configurada')
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY deve ter 32 bytes (64 hex chars)')
  return key
}

/** Criptografa uma string. Retorna "iv:tag:ciphertext" em hex. */
export function encrypt(plaintext: string): string {
  const key    = getKey()
  const iv     = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/** Descriptografa uma string no formato "iv:tag:ciphertext" em hex. */
export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':')
  if (!ivHex || !tagHex || !dataHex) throw new Error('Formato de ciphertext inválido')
  const key     = getKey()
  const iv      = Buffer.from(ivHex, 'hex')
  const tag     = Buffer.from(tagHex, 'hex')
  const data    = Buffer.from(dataHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data).toString('utf8') + decipher.final('utf8')
}

/** Criptografa apenas se o valor não estiver vazio. Retorna '' para strings vazias. */
export function encryptIfNotEmpty(value: string): string {
  return value ? encrypt(value) : ''
}

/** Descriptografa apenas se o valor não estiver vazio. Retorna '' para strings vazias. */
export function decryptIfNotEmpty(value: string): string {
  if (!value) return ''
  try { return decrypt(value) } catch { return '' }
}
