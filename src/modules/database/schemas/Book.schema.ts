import { Document, Schema } from 'mongoose'
import BookDTO from '../interfaces/Book/Book.DTO'
import { User } from './User.schema'

export class Book {
  constructor ({
    _id,
    title,
    authors,
    pages,
    publicationDate,
    publisher,
    price,
    seller
  }: BookDTO) {
    this._id = _id
    this.title = title
    this.authors = authors
    this.pages = pages
    this.publicationDate = publicationDate
    this.publisher = publisher
    this.price = price
    this.seller = seller
  }

  _id: string
  title: string
  authors: string
  pages: number
  publicationDate: Date
  publisher: string
  price: number
  seller: User | string
}

export type BookDocument = Book & Document
export const bookSchema = new Schema({
  _id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  authors: {
    type: String,
    required: true
  },
  pages: {
    type: Number,
    required: true
  },
  publicationDate: {
    type: Date,
    required: true
  },
  publisher: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  seller: {
    type: String,
    ref: 'users',
    required: true
  }
})
