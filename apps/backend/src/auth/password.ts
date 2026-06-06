import { hash, verify } from "@node-rs/argon2"

const passwordOptions = {
  memoryCost: 4096,
  timeCost: 3,
  parallelism: 1,
} as const

export function hashPassword(password: string): Promise<string> {
  return hash(password, passwordOptions)
}

export function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  return verify(hashValue, password, passwordOptions)
}
