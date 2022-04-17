export enum UserRoles {
  user,
  seller,
  adm,
  owner
}

export default interface UserDTO {
  _id: string
  name: string
  email: string
  phone: string
  details: {
    role: UserRoles
    balance: number
    booksSold: number
    dates: {
      lastSeen: Date
      joined: Date
    }
  }
}
