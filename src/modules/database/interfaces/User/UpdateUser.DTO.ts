import { UserRoles } from './User.DTO'

export default interface UpdateUserDTO {
  name: string
  email: string
  phone: string
  details: {
    role: UserRoles
    balance: number
    booksSold: number
  }
}
