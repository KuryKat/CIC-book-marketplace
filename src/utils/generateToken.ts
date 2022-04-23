import { JWT } from '@config'
import { sign } from 'jsonwebtoken'

export default function generateToken (_id: string, name: string): string {
  return sign({ _id, name }, JWT.secret, { algorithm: 'HS512', expiresIn: 86400 })
}
