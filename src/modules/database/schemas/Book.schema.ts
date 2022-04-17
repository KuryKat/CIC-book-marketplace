import { Document, Schema } from 'mongoose'
import BookDTO from '../interfaces/Book/Book.DTO'

export class Book {
  constructor ({
    _id,
    title,
    author,
    pages,
    publicationDate,
    publisher,
    price
  }: BookDTO) {
    this._id = _id
    this.title = title
    this.author = author
    this.pages = pages
    this.publicationDate = publicationDate
    this.publisher = publisher
    this.price = price
  }

  _id: string
  title: string
  author: string
  pages: number
  publicationDate: Date
  publisher: string
  price: number
}

export type BookDocument = Book & Document
export const bookSchema = new Schema({
  _id: String,
  title: String,
  author: String,
  pages: Number,
  publicationDate: Date,
  publisher: String,
  price: Number
})
