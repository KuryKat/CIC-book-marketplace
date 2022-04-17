import { Document, Schema } from 'mongoose'
import UserDTO, { UserRoles } from '../interfaces/User/User.DTO'

export class User {
  constructor ({
    _id,
    name,
    email,
    phone,
    details
  }: UserDTO) {
    this._id = _id
    this.name = name
    this.email = email
    this.phone = phone
    this.details =
      details != null
        ? details
        : {
            role: UserRoles.user,
            balance: 0,
            booksSold: 0,
            dates: {
              lastSeen: new Date(),
              joined: new Date()
            }
          }
  }

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

export type UserDocument = User & Document
export const userSchema = new Schema({
  _id: String,
  name: String,
  email: String,
  phone: {
    default: null,
    type: String
  },
  details: {
    role: {
      default: UserRoles.user,
      type: Number
    },
    balance: {
      default: 0,
      type: Number
    },
    booksSold: {
      default: 0,
      type: Number
    },
    dates: {
      lastSeen: {
        default: Date.now,
        type: Date
      },
      joined: {
        default: Date.now,
        type: Date
      }
    }
  }
})
