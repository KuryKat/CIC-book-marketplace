import { User } from '@modules/database/schemas/User.schema'

export default interface BookDTO {
  _id: string
  title: string
  authors: string
  pages: number
  publicationDate: Date
  publisher: string
  price: number
  seller: User | string
}
