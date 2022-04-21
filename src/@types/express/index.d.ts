import { User } from '@modules/database/schemas/User.schema'
import BookService from '@modules/database/services/Book.service'
import UserService from '@modules/database/services/User.service'

declare global {
  namespace Express {
    interface Request {
      userID?: string
      user?: User
      userService: UserService
      bookService: BookService
    }
  }
}
