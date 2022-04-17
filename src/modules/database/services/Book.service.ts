import { Model, FilterQuery } from 'mongoose'
import BookDTO from '../interfaces/Book/Book.DTO'
import UpdateBookDTO from '../interfaces/Book/UpdateBook.DTO'
import { Book, BookDocument } from '../schemas/Book.schema'

export default class BookService {
  constructor (
    private readonly BookModel: Model<BookDocument>
  ) { }

  async createBook (newBook: BookDTO): Promise<Book> {
    return await (new this.BookModel(newBook)).save()
  }

  async getBook (search?: string, sort = 'recent', page = 1, limit = 10): Promise<Book[]> {
    const params: FilterQuery<BookDocument> = {}
    let sortOrder = {}

    if (search != null) {
      if (search.length > 0) {
        const regex = { $regex: search, $options: 'i' }
        params.$or = [{ title: regex }, { author: regex }, { publisher: regex }]
      }
    }

    if (sort === 'recent') {
      sortOrder = { publicationDate: -1 }
    } else if (sort === 'smallest') {
      sortOrder = { pages: 1 }
    } else if (sort === 'biggest') {
      sortOrder = { pages: -1 }
    } else if (sort === 'cheapest') {
      sortOrder = { price: 1 }
    } else if (sort === 'mostExpensive') {
      sortOrder = { price: 1 }
    }

    const books = await this.BookModel
      .find(params)
      .sort(sortOrder)
      .limit(limit)
      .skip((page - 1) * limit)
      .exec()

    const formatedBooks = []
    for (const book of books) {
      formatedBooks.push(new Book(book))
    }

    return formatedBooks
  }

  async getBookByID (bookID: string): Promise<Book | undefined> {
    const result = await this.BookModel.findById(bookID).exec()

    if (result == null) {
      return
    }

    return result
  }

  async updateBook (bookToUpdate: Book, updatedBook: UpdateBookDTO): Promise<Book | undefined> {
    const dbBook = await this.BookModel.findById(bookToUpdate._id).exec()

    if (dbBook == null) {
      return
    }

    dbBook.title = updatedBook.title
    dbBook.author = updatedBook.author
    dbBook.pages = updatedBook.pages
    dbBook.publicationDate = updatedBook.publicationDate
    dbBook.publisher = updatedBook.publisher
    dbBook.price = updatedBook.price

    return new Book(await dbBook.save())
  }

  async deleteBook (bookID: string): Promise<boolean> {
    const result = await this.BookModel.findByIdAndDelete(bookID).exec()
    return result != null
  }
}
