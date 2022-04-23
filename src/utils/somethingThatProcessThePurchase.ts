import { Book } from '@modules/database/schemas/Book.schema'
import { User } from '@modules/database/schemas/User.schema'
import UserService from '@modules/database/services/User.service'

export default async function somethingThatProcessThePurchase (user: User, book: Book, userService: UserService): Promise<void> {
  const chanceToFail = Boolean(Math.random() < 0.9)
  if (chanceToFail) {
    throw new Error('3032 | Sorry, the payment cannot be completed now.')
  }

  (user.details.purchasedBooks as string[]).push(book._id)
  await userService.updateUser(user, user, 'auto')

  const seller = await userService.getUserByID((book.seller as User)._id)

  if (seller == null) {
    throw new Error('404 | Seller Not Found')
  }

  seller.details.booksSold++
  seller.details.balance += book.price
  await userService.updateUser(seller, seller, 'auto')
}
