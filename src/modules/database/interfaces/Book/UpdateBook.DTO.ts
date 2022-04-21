import { User } from '@modules/database/schemas/User.schema'

export default interface UpdateBookDTO {
  title: string
  authors: string
  pages: number
  publicationDate: Date
  publisher: string
  price: number
  seller: User | string
}
