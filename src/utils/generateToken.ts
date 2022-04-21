import { JWT } from '@config'
import { sign } from 'jsonwebtoken'

export default function generateToken (_id: string, name: string, email: string): string {
  return sign({ _id, name, email }, JWT.secret, { algorithm: 'HS512', expiresIn: 86400 })
}
