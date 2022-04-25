import { Error as MongooseErrors } from 'mongoose'
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
import HTTPError from '@utils/Errors/HTTPError'

const router = Router()

/**
 * @openapi
 * paths:
 *  '/api/books':
 *    get:
 *      tags:
 *        - Books
 *      summary: Get books
 *      description: >
 *        Get multiple books from a search or from different sort orders<br><br>
  *      parameters:
 *        - in: query
 *          name: sort
 *          schema:
 *            type: string
 *            enum: ["recent", "smallest", "biggest", "cheapest", "mostExpensive"]
 *          description: The sort order for the retrieved books
 *        - in: query
 *          name: search
 *          schema:
 *            type: string
 *          description: "The search string to search on the books (it searchs on the following fields: title, authors, publisher)"
 *        - in: query
 *          name: page
 *          schema:
 *            type: number
 *          description: The page number
 *        - in: query
 *          name: limit
 *          schema:
 *            type: number
 *          description: The limit of books to retrieve
 *      responses:
 *        200:
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                default: []
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/Book'
 *                example:
 *                  - _id: '6916625884354668544'
 *                    title: 'Harry Potter and the Half-Blood Prince (Harry Potter  #6)'
 *                    authors: J.K. Rowling/Mary GrandPré
 *                    pages: 873
 *                    publicationDate: '2006-09-16T03:00:00.000Z'
 *                    publisher: Scholastic Inc.
 *                    price: 93.57
 *                    seller: '6915856544374155264'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.get('/', (async (req, res) => {
  try {
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
  } catch (error) {
    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

/**
 * @openapi
 * paths:
 *  '/api/books':
 *    post:
 *      tags:
 *        - Books
 *      summary: Post new Books
 *      description: >
 *        **REQUIRES** Token to validate user <br><br>
 *        This endpoint **REQUIRES** a valid CSV uploaded in a multipart/form-data
 *      security:
 *        - bearerAuth: []
 *      requestBody:
 *        summary: File in CSV format to upload new books into the API
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                attachment:
 *                  type: string
 *                  format: binary
 *      responses:
 *        201:
 *          description: Successfully Created Books
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/Book'
 *                example:
 *                  - _id: '6916625884354668544'
 *                    title: 'Harry Potter and the Half-Blood Prince (Harry Potter  #6)'
 *                    authors: J.K. Rowling/Mary GrandPré
 *                    pages: 873
 *                    publicationDate: '2006-09-16T03:00:00.000Z'
 *                    publisher: Scholastic Inc.
 *                    price: 93.57
 *                    seller: '6915856544374155264'
 *        400:
 *          $ref: '#/components/responses/BadRequest'
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 *        403:
 *          $ref: '#/components/responses/Forbidden'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *        413:
 *          $ref: '#/components/responses/PayloadTooLarge'
 *        415:
 *          $ref: '#/components/responses/UnsupportedMediaType'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.post('/', ValidateToken, GetUser, UpdateLastSeen, (async (req, res) => {
  try {
    if (req.user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    if (req.user.details.role < UserRoles.seller) {
      return res.status(403).send({ auth: false, message: 'You\'re not an authorized seller! If you think this is a mistake, talk to our staff!' })
    }

    const attachment = req.files?.attachment

    if (attachment == null) {
      return res.status(400).send({ auth: false, message: 'File is required' })
    }

    if (Array.isArray(attachment)) {
      return res.status(413).send({ auth: false, message: 'Too Many Files' })
    }

    const csvMimetypes = [
      'text/csv',
      'text/x-csv',
      'application/csv',
      'application/x-csv',
      'application/vnd.ms-excel',
      'text/comma-separated-values',
      'text/x-comma-separated-values',
      'text/tab-separated-values'
    ]

    if (!(csvMimetypes.includes(attachment.mimetype))) {
      return res.status(415).send({ auth: false, message: 'Invalid File Type! it needs to be a valid CSV file!' })
    }

    const headers = ['title', 'authors', 'numPages', 'publicationDate', 'publisher', 'price']
    const books = parse(attachment.data.toString(), { header: true, delimiter: ',', quoteChar: '🙌' }).data as CreateBookDTO[]
    const fileNotEmpty =
    books.shift() != null &&
    Object.keys(books.shift() as CreateBookDTO)
      .every((fileHeader, index) => fileHeader === headers[index])

    if (!fileNotEmpty) {
      return res.status(400).send({ auth: false, message: 'Invalid File! This file isn\'t formatted correctly or is empty' })
    }

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

    return res.status(201).send({ auth: true, message: 'Books successfully created!' })
  } catch (error) {
    if (error instanceof MongooseErrors.ValidationError) {
      return res.status(400).send({ auth: false, message: 'Some of the fields on your document was invalid, check your values to see if they match the requirements (Make sure to not leave any empty line in the document)' })
    }

    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

/**
 * @openapi
 * paths:
 *  '/api/books/{id}':
 *    get:
 *      tags:
 *        - Books
 *      summary: Get a Book from ID
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          schema:
 *            type: string
 *          description: The Book ID
 *          example: "6916625884354668544"
 *      responses:
 *        200:
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Book'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', (async (req, res) => {
  try {
    const { id } = req.params
    const book = await req.bookService.getBookByID(id, true)

    if (book == null) {
      return res.status(404).send({ auth: false, message: 'Book Not Found' })
    }

    if (req.user != null) {
      await UpdateLastSeenInsideHandler(req.user, req.userService)
    }

    res.send(book)
  } catch (error) {
    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

/**
 * @openapi
 * paths:
 *  '/api/books/{id}/seller':
 *    get:
 *      deprecated: true
 *      tags:
 *        - Books
 *      summary: Get the Book Seller
 *      description: >
 *        This endoint is deprecated since isn't common to APIs to redirect, but can be used!
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          schema:
 *            type: string
 *          description: The Book ID
 *          example: "6916625884354668544"
 *      responses:
 *        200:
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                default: {}
 *                oneOf:
 *                  - allOf:
 *                    - $ref: '#/components/schemas/User'
 *                    - properties:
 *                        password:
 *                          default: null
 *                        email:
 *                          nullable: true
 *                          default: null
 *                        details:
 *                          properties:
 *                            phone:
 *                              nullable: true
 *                              default: null
 *                            balance:
 *                              nullable: true
 *                              default: null
 *                  - allOf:
 *                    - $ref: '#/components/schemas/User'
 *                    - properties:
 *                        password:
 *                          default: null
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id/seller', (async (req, res) => {
  try {
    const { id } = req.params
    const book = await req.bookService.getBookByID(id, true)

    if (book == null) {
      return res.status(404).send({ auth: false, message: 'Book Not Found' })
    }

    if (req.user != null) {
      await UpdateLastSeenInsideHandler(req.user, req.userService)
    }

    res.redirect('/api/users/' + (book.seller as User)._id)
  } catch (error) {
    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

/**
 * @openapi
 * paths:
 *  '/api/books/{id}':
 *    post:
 *      tags:
 *        - Books
 *      summary: Post PDF to a specific Book
 *      description: >
 *        **REQUIRES** Token to validate user <br><br>
 *        This endpoint **REQUIRES** a valid PDF uploaded in a multipart/form-data body<br><br>
 *        **The PDF metadata must match the same values that were given when uploading the book with CSV**<br>
 *        Values that need to match: title, authors, numPages, publicationDate, publisher <br>
 *        Respective values in PDF metadata: Title, Author, pages, CreationDate, Producer
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          schema:
 *            type: string
 *          description: The Book ID
 *          example: "6916625884354668544"
 *      requestBody:
 *        summary: File in CSV format to upload new books into the API
 *        required: true
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                book:
 *                  type: string
 *                  format: binary
 *      responses:
 *        201:
 *          $ref: '#/components/responses/Created'
 *        400:
 *          $ref: '#/components/responses/BadRequest'
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 *        403:
 *          $ref: '#/components/responses/Forbidden'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *        413:
 *          $ref: '#/components/responses/PayloadTooLarge'
 *        415:
 *          $ref: '#/components/responses/UnsupportedMediaType'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.post('/:id', ValidateToken, GetUser, UpdateLastSeen, (async (req, res) => {
  try {
    const { id } = req.params
    const book = await req.bookService.getBookByID(id, true)

    if (book == null) {
      return res.status(404).send({ auth: false, message: 'Book Not Found' })
    }

    if (req.user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    if (req.user.details.role < UserRoles.seller) {
      return res.status(403).send({ auth: false, message: 'You\'re not an authorized seller! If you think this is a mistake, talk to our staff!' })
    }

    if (req.user._id !== (book.seller as User)._id) {
      return res.status(403).send({ auth: false, message: 'You\'re not this book\'s seller! If you think this is a mistake, talk to our staff!' })
    }

    const bookPDF = req.files?.book

    if (bookPDF == null) {
      return res.status(400).send({ auth: false, message: 'File  is required' })
    }

    if (Array.isArray(bookPDF)) {
      return res.status(413).send({ auth: false, message: 'Too Many Files' })
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

    return res.status(201).send({ auth: true, message: 'Book PDF successfully saved!' })
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'InvalidPDFException') {
        return res.status(415).send({ auth: false, message: 'Invalid File Type! it needs to be a valid PDF file!' })
      }
    }

    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

/**
 * @openapi
 * paths:
 *  '/api/books/{id}/buy':
 *    post:
 *      tags:
 *        - Books
 *      summary: Buy a Book
 *      description: >
 *        **REQUIRES** Token to validate user <br><br>
 *        This endpoint simmulate a book purchase, updating both buyer's purchasedBooks and seller's balance/booksSold values
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          schema:
 *            type: string
 *          description: The Book ID
 *          example: "6916625884354668544"
 *      responses:
 *        200:
 *          $ref: '#/components/responses/OK'
 *        400:
 *          $ref: '#/components/responses/BadRequest'
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 *        402:
 *          $ref: '#/components/responses/PaymentRequired'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.post('/:id/buy', ValidateToken, GetUser, UpdateLastSeen, (async (req, res) => {
  try {
    const { id } = req.params
    const book = await req.bookService.getBookByID(id, true)

    if (book == null) {
      return res.status(404).send({ auth: false, message: 'Book Not Found' })
    }

    if (book.seller == null) {
      return res.status(404).send({ auth: false, message: 'Seller Not Found' })
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
    if (error instanceof HTTPError) {
      if (error.code === 402) {
        return res.status(402).send({ auth: false, message: error.message })
      }

      if (error.code === 404) {
        return res.status(404).send({ auth: false, message: error.message })
      }

      if (error.code === 400) {
        return res.status(400).send({ auth: false, message: error.message })
      }
    }

    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

/**
 * @openapi
 * paths:
 *  '/api/books/{id}/download':
 *    get:
 *      tags:
 *        - Books
 *      summary: Download a Book
 *      description: >
 *        **REQUIRES** Token to validate user <br><br>
 *        This endpoint send the book file to download if the user have bought it
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          schema:
 *            type: string
 *          description: The Book ID
 *          example: "6916625884354668544"
 *      responses:
 *        200:
 *          description: The respective PDF file for the requested Book
 *          content:
 *            application/pdf:
 *              schema:
 *                type: file
 *                format: binary
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 *        403:
 *          $ref: '#/components/responses/Forbidden'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id/download', ValidateToken, GetUser, UpdateLastSeen, (async (req, res) => {
  try {
    const { id } = req.params
    const book = await req.bookService.getBookByID(id, true)

    if (book == null) {
      return res.status(404).send({ auth: false, message: 'Book Not Found' })
    }

    if (req.user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    const hasBook = (req.user.details.purchasedBooks as string[]).includes(book._id)

    if (!hasBook) {
      return res.status(403).send({ auth: false, message: 'You haven\'t bought this book yet!' })
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

/**
 * @openapi
 * paths:
 *  '/api/books/{id}':
 *    delete:
 *      tags:
 *        - Books
 *      summary: Deletes a Book
 *      description: >
 *        **REQUIRES** Token to validate user <br><br>
 *        This endpoint deletes the book from the database and the PDF file from the storage (if it exists)
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          schema:
 *            type: string
 *          description: The Book ID
 *          example: "6916625884572772352"
 *      responses:
 *        200:
 *          $ref: '#/components/responses/OK'
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 *        403:
 *          $ref: '#/components/responses/Forbidden'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.delete('/:id', ValidateToken, GetUser, UpdateLastSeen, (async (req, res) => {
  try {
    const { id } = req.params
    const book = await req.bookService.getBookByID(id, true)

    if (book == null) {
      return res.status(404).send({ auth: false, message: 'Book Not Found' })
    }

    if (req.user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    if (req.user.details.role < UserRoles.seller) {
      return res.status(403).send({ auth: false, message: 'You\'re not an authorized seller! If you think this is a mistake, talk to our staff!' })
    }

    if (req.user._id !== (book.seller as User)._id) {
      if (req.user.details.role < UserRoles.adm) {
        return res.status(403).send({ auth: false, message: 'You\'re not this book\'s seller! If you think this is a mistake, talk to our staff!' })
      }
    }

    res.send({ auth: true, message: 'Book Successfully Deleted' })
  } catch (error) {
    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

export default router
