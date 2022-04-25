import { Book } from '@modules/database/schemas/Book.schema'
import { User } from '@modules/database/schemas/User.schema'
import UserService from '@modules/database/services/User.service'
import HTTPError from './Errors/HTTPError'

export default async function somethingThatProcessThePurchase (user: User, book: Book, userService: UserService): Promise<void> {
  const chanceToFail = Boolean(Math.random() < 0.45)
  if (chanceToFail) {
    throw new HTTPError(402, 'Sorry, the payment cannot be completed now.')
  }

  const userBooks = user.details.purchasedBooks as string[]
  if (userBooks.includes(book._id)) {
    throw new HTTPError(400, 'You already have this book! Try downloading it!')
  }

  userBooks.push(book._id)
  await userService.updateUser(user, user, 'auto')

  const seller = await userService.getUserByID((book.seller as User)._id)

  if (seller == null) {
    throw new HTTPError(404, 'Seller Not Found')
  }

  seller.details.booksSold++
  seller.details.balance += book.price
  await userService.updateUser(seller, seller, 'auto')
}
