import { Book } from '@modules/database/schemas/Book.schema'
import { UserRoles } from './User.DTO'

export default interface UpdateUserDTO {
  name: string
  email: string
  password: string
  details: {
    phone: string | null
    role: UserRoles
    balance: number
    booksSold: number
    purchasedBooks: string[] | Book[]
    dates: {
      lastSeen: Date
    }
  }
}
