import { RequestHandler, Router } from 'express'
import { parse } from 'papaparse'
import generateID from '@utils/generateID'
import BookDTO from '@modules/database/interfaces/Book/Book.DTO'
import CreateBookDTO from '@modules/database/interfaces/Book/CreateBook.DTO'
import ValidateToken from '@utils/Middlewares/ValidateToken'
import GetUser from '@utils/Middlewares/GetUser'
import { UserRoles } from '@modules/database/interfaces/User/User.DTO'
import UpdateLastSeen, { UpdateLastSeenInsideHandler } from '@utils/Middlewares/UpdateLastSeen'
import { User } from '@modules/database/schemas/User.schema'
import pdf from 'pdf-parse'
import compareDates from '@utils/Dates/compareDates'
import convertPDFDateToDate from '@utils/Dates/convertPdfDateToDate'
import somethingThatProcessThePurchase from '@utils/somethingThatProcessThePurchase'
import { logger } from '@utils/logger'

const router = Router()

router.get('/', (async (req, res) => {
  const { search, page, limit } = req.query
  let { sort } = req.query

  const queryPage = Number.parseInt(page as string)
  const queryLimit = Number.parseInt(limit as string)
  let pageNum: number | undefined = Number.isNaN(queryPage) ? 1 : queryPage < 1 ? 1 : queryPage
  let limitNum: number | undefined = Number.isNaN(queryLimit) ? 1 : queryLimit < 1 ? 1 : (queryLimit > 10) ? 10 : queryLimit

  if (page == null) {
    pageNum = undefined
  }

  if (limit == null) {
    limitNum = undefined
  }

  if (typeof sort !== 'string') {
    sort = undefined
  }

  const results = await req.bookService.getBook(search as string ?? '', sort, pageNum, limitNum)

  if (req.user != null) {
    await UpdateLastSeenInsideHandler(req.user, req.userService)
  }

  return res.json(results)
}) as RequestHandler)

router.post('/', ValidateToken, GetUser, UpdateLastSeen, (async (req, res) => {
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

    const books = parse(attachment.data.toString(), { header: true, delimiter: ',', quoteChar: '🙌' }).data as CreateBookDTO[]

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

    res.status(201).send({ auth: true, message: 'Books successfully created!' })
  } catch (error) {
    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

router.get('/:id', (async (req, res) => {
  const { id } = req.params
  const book = await req.bookService.getBookByID(id, true)

  if (book == null) {
    return res.status(404).send({ auth: false, message: 'Book Not Found' })
  }

  if (req.user != null) {
    await UpdateLastSeenInsideHandler(req.user, req.userService)
  }

  res.send(book)
}) as RequestHandler)

router.get('/:id/seller', (async (req, res) => {
  const { id } = req.params
  const book = await req.bookService.getBookByID(id, true)

  if (book == null) {
    return res.status(404).send({ auth: false, message: 'Book Not Found' })
  }

  if (req.user != null) {
    await UpdateLastSeenInsideHandler(req.user, req.userService)
  }

  res.redirect('/api/users/' + (book.seller as User)._id)
}) as RequestHandler)

router.post('/:id', ValidateToken, GetUser, UpdateLastSeen, (async (req, res) => {
  try {
    const { id } = req.params
    const book = await req.bookService.getBookByID(id, true)

    if (book == null) {
      return res.status(404).send({ auth: false, message: 'Book Not Found' })
    }

    if (req.user != null) {
      await UpdateLastSeenInsideHandler(req.user, req.userService)
    }

    if (req.user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    if (req.user.details.role < UserRoles.seller) {
      return res.status(401).send({ auth: false, message: 'You\'re not an authorized seller! If you think this is a mistake, talk to our staff!' })
    }

    if (req.user._id !== (book.seller as User)._id) {
      return res.status(401).send({ auth: false, message: 'You\'re not this book\'s seller! If you think this is a mistake, talk to our staff!' })
    }

    const bookPDF = req.files?.book

    if (bookPDF == null) {
      return res.status(400).send({ auth: false, message: 'File Not Found' })
    }

    if (Array.isArray(bookPDF)) {
      return res.status(400).send({ auth: false, message: 'Too Many Files' })
    }

    const bookPDFData = await pdf(bookPDF.data)
    const isSameDate = compareDates(book.publicationDate, convertPDFDateToDate(bookPDFData.info.CreationDate), true)

    const isSameBook =
      book.authors === bookPDFData.info.Author &&
      book.title === bookPDFData.info.Title &&
      book.pages === bookPDFData.numpages &&
      book.publisher === bookPDFData.info.Producer &&
      isSameDate

    if (!isSameBook) {
      return res.status(400).send({ auth: false, message: 'Some of the informations on the PDF metadata don\'t match the informations on the database' })
    }

    await req.bookService.writeBookPDF((book.seller as User)._id, id, book.title, bookPDF.data)

    res.status(201).send({ auth: true, message: 'Book PDF successfully saved!' })
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'InvalidPDFException') {
        return res.status(400).send({ auth: false, message: 'Invalid File Type! it needs to be a valid PDF file!' })
      }
    }

    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

router.post('/:id/buy', ValidateToken, GetUser, UpdateLastSeen, (async (req, res) => {
  try {
    const { id } = req.params
    const book = await req.bookService.getBookByID(id, true)

    if (book == null) {
      return res.status(404).send({ auth: false, message: 'Book Not Found' })
    }

    if (req.user != null) {
      await UpdateLastSeenInsideHandler(req.user, req.userService)
    }

    if (req.user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    const bookFile = await req.bookService.getBookPDFPath((book.seller as User)._id, book._id)

    if (bookFile == null) {
      return res.status(404).send({ auth: false, message: 'Book PDF Not Found, the purchase was cancelled!' })
    }

    await somethingThatProcessThePurchase(req.user, book, req.userService)

    res.send({ auth: true, message: 'Book successfully purchased!' })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('3032')) {
        res.status(402).send({ auth: false, message: 'Sorry, the payment cannot be completed now.' })
      }

      if (error.message.startsWith('404')) {
        res.status(404).send({ auth: false, message: error.message.split('|')[1] })
      }
    }

    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

router.get('/:id/download', ValidateToken, GetUser, UpdateLastSeen, (async (req, res) => {
  try {
    const { id } = req.params
    const book = await req.bookService.getBookByID(id, true)

    if (book == null) {
      return res.status(404).send({ auth: false, message: 'Book Not Found' })
    }

    if (req.user != null) {
      await UpdateLastSeenInsideHandler(req.user, req.userService)
    }

    if (req.user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    const hasBook = (req.user.details.purchasedBooks as string[]).includes(book._id)

    if (!hasBook) {
      return res.status(402).send({ auth: false, message: 'You haven\'t bought this book yet!' })
    }

    const bookFile = await req.bookService.getBookPDFPath((book.seller as User)._id, book._id)

    if (bookFile == null) {
      return res.status(404).send({ auth: false, message: 'Book PDF Not Found' })
    }

    res.sendFile(bookFile)
  } catch (error) {
    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

export default router
