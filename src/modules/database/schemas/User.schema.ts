import { Document, Schema } from 'mongoose'
import UserDTO, { UserDetails, UserRoles } from '../interfaces/User/User.DTO'

export class User {
  constructor ({
    _id,
    name,
    email,
    password,
    details
  }: UserDTO) {
    this._id = _id
    this.name = name
    this.email = email
    this.password = password
    this.details =
      details != null
        ? details
        : {
            phone: null,
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
  password: string
  details: UserDetails
}

export type UserDocument = User & Document
export const userSchema = new Schema({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v: string): boolean => /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
      message: '\'{VALUE}\' is not a valid email!'
    }
  },
  password: {
    type: String,
    min: 8,
    max: 40,
    required: true
  },
  details: {
    phone: {
      default: null,
      type: String
    },
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
