export enum UserRoles {
  user,
  seller,
  adm,
  owner
}

export interface UserDetails {
  phone: string | null
  role: UserRoles
  balance: number
  booksSold: number
  dates: {
    lastSeen: Date
    joined: Date
  }
}

export default interface UserDTO {
  _id: string
  name: string
  email: string
  password: string
  details: UserDetails | undefined
}
