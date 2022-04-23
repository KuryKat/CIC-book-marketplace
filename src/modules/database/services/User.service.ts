import { Model, FilterQuery } from 'mongoose'
import UpdateUserDTO from '../interfaces/User/UpdateUser.DTO'
import UserDTO from '../interfaces/User/User.DTO'
import { User, UserDocument } from '../schemas/User.schema'
import BookService from './Book.service'

export default class UserService {
  constructor (
    private readonly UserModel: Model<UserDocument>,
    private readonly bookService: BookService
  ) { }

  async createUser (newUser: UserDTO): Promise<User> {
    return new User(await (new this.UserModel(newUser)).save())
  }

  async getUser (search?: string, showRestrictInfo = false, sort = 'recent', page = 1, limit = 10): Promise<User[]> {
    const params: FilterQuery<UserDocument> = {}
    let sortOrder = {}
    let restrictInfo = {}

    if (search != null) {
      if (search.length > 0) {
        const regex = { $regex: search, $options: 'i' }
        params.$or = [{ name: regex }]
      }
    }

    if (sort === 'recent') {
      sortOrder = { 'details.dates.joined': -1 }
    } else if (sort === 'lastSeen') {
      sortOrder = { 'details.dates.lastSeen': -1 }
    } else if (sort === 'famous') {
      sortOrder = { 'details.booksSold': -1 }
    } else {
      sortOrder = { 'details.dates.joined': -1 }
    }

    if (showRestrictInfo) {
      restrictInfo = { password: 0 }
    } else {
      restrictInfo = { password: 0, email: 0, 'details.phone': 0, 'details.balance': 0 }
    }

    const users = await this.UserModel
      .find(params, restrictInfo)
      .sort(sortOrder)
      .limit(limit)
      .skip((page - 1) * limit)
      .exec()

    const formatedUsers = []
    for (const user of users) {
      formatedUsers.push(new User(user))
    }

    return formatedUsers
  }

  async getUserByID (userID: string, showRestrictInfo = false): Promise<User | undefined> {
    let restrictInfo = {}
    if (showRestrictInfo) {
      restrictInfo = { password: 0 }
    } else {
      restrictInfo = { password: 0, email: 0, 'details.phone': 0, 'details.balance': 0 }
    }

    const result = await this.UserModel.findById(userID, restrictInfo).exec()

    if (result == null) {
      return
    }

    return new User(result)
  }

  async getUserByEmail (email: string): Promise<User | undefined> {
    const result = await this.UserModel.findOne({ email }).exec()

    if (result == null) {
      return
    }

    return new User(result)
  }

  async updateUser (userToUpdate: User, updatedUser: UpdateUserDTO, updateType: 'user' | 'adm' | 'auto'): Promise<User | undefined> {
    const dbUser = await this.UserModel.findById(userToUpdate._id).exec()

    if (dbUser == null) {
      return
    }

    switch (updateType) {
      case 'user':
        dbUser.name = updatedUser.name
        dbUser.email = updatedUser.email
        dbUser.password = updatedUser.password
        dbUser.details.phone = updatedUser.details.phone
        break
      case 'adm':
        dbUser.details.role = updatedUser.details.role
        break
      case 'auto':
        dbUser.details.purchasedBooks = updatedUser.details.purchasedBooks
        dbUser.details.dates.lastSeen = updatedUser.details.dates.lastSeen
        dbUser.details.balance = updatedUser.details.balance
        dbUser.details.booksSold = updatedUser.details.booksSold
        break
    }

    return new User(await dbUser.save())
  }

  async deleteUser (userID: string): Promise<boolean> {
    const result = await this.UserModel.findByIdAndDelete(userID).exec()
    const books = await this.bookService.getBooksBySeller(userID)

    for (const book of books) {
      await this.bookService.deleteBook(book._id)
    }

    return result != null
  }
}
