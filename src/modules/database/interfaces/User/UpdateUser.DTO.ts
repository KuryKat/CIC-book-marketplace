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
  }
}
