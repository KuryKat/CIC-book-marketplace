import { Book } from '@modules/database/schemas/Book.schema'
import { RequestHandler, Router } from 'express'
import { parse } from 'papaparse'
import generateID from '@utils/generateID'
import BookDTO from '@modules/database/interfaces/Book/Book.DTO'
import CreateBookDTO from '@modules/database/interfaces/Book/CreateBook.DTO'
import ValidateToken from '@utils/Middlewares/ValidateToken'
import GetUser from '@utils/Middlewares/GetUser'
import { UserRoles } from '@modules/database/interfaces/User/User.DTO'

const router = Router()

router.get('/', (async (req, res) => {
  const { search, sort, page, limit } = req.query
  let results: Book[] = []

  const queryPage = Number.parseInt(page as string)
  const queryLimit = Number.parseInt(limit as string)
  const pageNum = Number.isNaN(queryPage) ? 1 : queryPage < 1 ? 1 : queryPage
  const limitNum = Number.isNaN(queryLimit) ? 1 : queryLimit < 1 ? 1 : (queryLimit > 10) ? 10 : queryLimit

  if (sort != null && typeof sort === 'string') {
    results = await req.bookService.getBook(search as string ?? '', sort, pageNum, limitNum)
  } else {
    results = await req.bookService.getBook(search as string ?? '')
  }

  return res.json(results)
}) as RequestHandler)

router.post('/', ValidateToken, GetUser, (async (req, res) => {
  try {
    if (req.user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    if (req.user.details.role < UserRoles.seller) {
      return res.status(401).send({ auth: false, message: 'You\'re not an authorized seller! If you think this is a mistake, talk to our staff!' })
    }

    const attachment = req.files?.attachment

    if (attachment == null) {
      return res.status(400).send({ auth: false, message: 'File Not Found' })
    }

    if (Array.isArray(attachment)) {
      return res.status(400).send({ auth: false, message: 'Too Many Files' })
    }

    const books = parse(attachment.data.toString(), { header: true, delimiter: ',' }).data as CreateBookDTO[]

    const createdBooks = []
    for (const book of books) {
      const _id = generateID()
      const parsedPages = Number.parseInt(book.numPages)
      const pagesNum = Number.isNaN(parsedPages) ? 0 : parsedPages < 1 ? 0 : parsedPages
      const parsedPrice = Number.parseFloat(book.price)
      const priceNum = Number.isNaN(parsedPrice) ? 0 : parsedPrice < 1 ? 0 : parsedPrice

      const newBook: BookDTO = {
        _id,
        title: book.title,
        authors: book.authors,
        pages: pagesNum,
        publicationDate: new Date(Date.parse(book.publicationDate)),
        publisher: book.publisher,
        price: priceNum,
        seller: req.user._id
      }
      createdBooks.push(await req.bookService.createBook(newBook))
    }

    res.send(createdBooks)
  } catch (error) {
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

export default router
