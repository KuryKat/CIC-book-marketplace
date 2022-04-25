import { Error as MongooseErrors } from 'mongoose'
import { RequestHandler, Router } from 'express'
import { JsonWebTokenError, JwtPayload, verify } from 'jsonwebtoken'
import { hash, genSalt } from 'bcryptjs'
import { JWT } from '@config'
import { UserRoles } from '@modules/database/interfaces/User/User.DTO'
import ValidateToken from '@utils/Middlewares/ValidateToken'
import GetUser from '@utils/Middlewares/GetUser'
import generateToken from '@utils/generateToken'
import UpdateLastSeen, { UpdateLastSeenInsideHandler } from '@utils/Middlewares/UpdateLastSeen'
import { logger } from '@utils/logger'

const router = Router()

/**
 * @openapi
 * paths:
 *  '/api/users':
 *    get:
 *      tags:
 *        - Users
 *      summary: Get users
 *      description: >
 *        Get multiple users from a search or from different sort orders<br><br>
 *        This endpoint doesn't _require_ an Authorization header,
 *        but when used, it can give more information on the users
 *        (if you're ADM or above on your Role) <br><br>
 *      security:
 *        - bearerAuth: []
  *      parameters:
 *        - in: query
 *          name: sort
 *          schema:
 *            type: string
 *            enum: ["recent", "lastSeen", "famous"]
 *          description: The sort order for the retrieved Users
 *        - in: query
 *          name: search
 *          schema:
 *            type: string
 *          description: The search string to search on the user's name
 *        - in: query
 *          name: page
 *          schema:
 *            type: number
 *          description: The page number
 *        - in: query
 *          name: limit
 *          schema:
 *            type: number
 *          description: The limit of users to retrieve
 *      responses:
 *        200:
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                default: []
 *                type: array
 *                items:
 *                  oneOf:
 *                    - allOf:
 *                      - $ref: '#/components/schemas/User'
 *                      - properties:
 *                          password:
 *                            default: null
 *                          email:
 *                            nullable: true
 *                            default: null
 *                          details:
 *                            properties:
 *                              phone:
 *                                nullable: true
 *                                default: null
 *                              balance:
 *                                nullable: true
 *                                default: null
 *                    - allOf:
 *                      - $ref: '#/components/schemas/User'
 *                      - properties:
 *                          password:
 *                            default: null
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.get('/', (async (req, res) => {
  try {
    const { authorization } = req.headers
    let showAll = false

    if (authorization != null) {
      const token = authorization?.split(' ')[1]

      if (token == null) {
        return res.status(401).send({ auth: false, message: 'No token provided.' })
      }

      const decoded = verify(token, JWT.secret) as JwtPayload

      const user = await req.userService.getUserByID(decoded._id)

      if (user == null) {
        return res.status(404).send({ auth: false, message: 'User Not Found' })
      }

      req.user = user
      showAll = user.details.role >= UserRoles.adm
      await UpdateLastSeenInsideHandler(user, req.userService)
    }

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

    const results = await req.userService.getUser(search as string ?? '', showAll, sort, pageNum, limitNum)

    if (req.user != null) {
      await UpdateLastSeenInsideHandler(req.user, req.userService)
    }

    return res.json(results)
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      return res.status(401).send({ auth: false, message: 'Invalid Token.' })
    }

    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

/**
 * @openapi
 * paths:
 *  '/api/users/{id}':
 *    get:
 *      tags:
 *        - Users
 *      summary: Get an user from ID
 *      description: >
 *        This endpoint doesn't _require_ an Authorization header,
 *        but when used, it can give more information on the user
 *        (if you're the user or if you're ADM or above on your Role)
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          schema:
 *            type: string
 *          description: The user ID
 *          example: "6917032803640764416"
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
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', (async (req, res) => {
  try {
    const { authorization } = req.headers
    const { id } = req.params
    let showAll = false

    if (authorization != null) {
      const token = authorization?.split(' ')[1]

      if (token == null) {
        return res.status(401).send({ auth: false, message: 'No token provided.' })
      }

      const decoded = verify(token, JWT.secret) as JwtPayload

      const user = await req.userService.getUserByID(decoded._id)

      if (user == null) {
        return res.status(404).send({ auth: false, message: 'User Not Found' })
      }

      req.user = user
      showAll = user._id === id || user.details.role >= UserRoles.adm
      await UpdateLastSeenInsideHandler(user, req.userService)
    }

    if (req.user != null) {
      await UpdateLastSeenInsideHandler(req.user, req.userService)
    }

    const user = await req.userService.getUserByID(id, showAll)
    res.send(user ?? {})
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      return res.status(401).send({ auth: false, message: 'Invalid Token.' })
    }

    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

/**
 * @openapi
 * paths:
 *  '/api/users/{id}/books':
 *    get:
 *      tags:
 *        - Users
 *      summary: Get user Books
 *      description: >
 *        Get the posted books catalogue of the given user (if they have any books)
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          schema:
 *            type: string
 *          description: The user ID
 *          example: "6915856544374155264"
 *        - in: query
 *          name: page
 *          schema:
 *            type: number
 *          description: The page number
 *        - in: query
 *          name: limit
 *          schema:
 *            type: number
 *          description: The limit of users to retrieve
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
router.get('/:id/books', (async (req, res) => {
  try {
    const { id } = req.params
    const { page, limit } = req.query
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

    const books = await req.bookService.getBooksBySeller(id, pageNum, limitNum)

    if (req.user != null) {
      await UpdateLastSeenInsideHandler(req.user, req.userService)
    }

    res.send(books)
  } catch (error) {
    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

/**
 * @openapi
 * paths:
 *  '/api/users/@me':
 *    patch:
 *      tags:
 *        - Users
 *      summary: Update your user on the database
 *      description: >
 *        **REQUIRES** Token to validate user <br><br>
 *        This endpoint Updates specific fields that the user can update by himself, such as password, email, etc.
 *      security:
 *        - bearerAuth: []
 *      requestBody:
 *        description: Data  **required** for user update
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                name:
 *                  type: string
 *                email:
 *                  type: string
 *                  format: email
 *                password:
 *                  type: string
 *                  format: password
 *                phone:
 *                  type: string
 *            examples:
 *              "Only Name":
 *                value:
 *                  name: "KuryKat"
 *              "Only Email":
 *                value:
 *                  email: "ku.ry@gmo.go"
 *              "Only Password":
 *                value:
 *                  password: "fries1324"
 *              "Only Phone":
 *                value:
 *                  phone: "+1-202-555-0126"
 *              "All together":
 *                value:
 *                  name: "KuryKat"
 *                  email: "ku.ry@gmo.go"
 *                  password: "fries1324"
 *                  phone: "+1-202-555-0126"
 *      responses:
 *        200:
 *          allOf:
 *            - $ref: '#/components/responses/OK'
 *            - content:
 *                application/json:
 *                  schema:
 *                    $ref: '#/components/schemas/SuccessfulLogin'
 *        400:
 *          $ref: '#/components/responses/BadRequest'
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *        409:
 *          $ref: '#/components/responses/Conflict'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.patch('/@me', ValidateToken, GetUser, UpdateLastSeen, (async (req, res) => {
  try {
    if (req.user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    let updatedUser = await req.userService.getUserByEmail(req.user.email)
    if (updatedUser == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    const { name, email, password, phone } = req.body

    if (name != null) {
      updatedUser.name = name
    }
    if (email != null) {
      updatedUser.email = email
    }
    if (password != null) {
      const salt = await genSalt()
      const hashedPass = await hash(password, salt)
      updatedUser.password = hashedPass
    }
    if (phone != null) {
      updatedUser.details.phone = phone
    }

    updatedUser = await req.userService.updateUser(req.user, updatedUser, 'user')

    if (updatedUser == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    const token = generateToken(updatedUser._id, updatedUser.name)
    res.send({ auth: true, token })
  } catch (error) {
    if (error instanceof MongooseErrors.ValidationError) {
      const errors = Object.values(error.errors)[0]
      return res.status(400).send({ auth: false, message: `${errors.name} - ${errors.message}` })
    }

    if (error instanceof Error) {
      if (error.message.startsWith('E11000')) {
        return res.status(409).send({ auth: false, message: 'Email already registered' })
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
 *  '/api/users/{id}':
 *    patch:
 *      tags:
 *        - Users
 *      summary: Update a user on the database (ADM)
 *      description: >
 *        **REQUIRES** Token to validate user <br><br>
 *        This endpoint Updates specific fields that the ADM can update to another user, being basically the ROLE value.
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          schema:
 *            type: string
 *          description: The user ID
 *          example: "6915857688089552896"
 *      requestBody:
 *        description: Data  **required** for Update user Role
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - role
 *              properties:
 *                role:
 *                  default: 0
 *                  type: number
 *                  enum:
 *                    - user
 *                    - seller
 *                    - adm
 *                    - owner
 *      responses:
 *        200:
 *          $ref: '#/components/responses/OK'
 *        400:
 *          $ref: '#/components/responses/BadRequest'
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 *        403:
 *          $ref: '#/components/responses/Forbidden'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.patch('/:id', ValidateToken, GetUser, UpdateLastSeen, (async (req, res) => {
  try {
    const { id } = req.params
    if (req.user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    if (req.user.details.role < UserRoles.adm) {
      return res.status(403).send({ auth: false, message: 'Access Denied' })
    }

    let updatedUser = await req.userService.getUserByID(id)
    if (updatedUser == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    const { role } = req.body

    if (role == null) {
      return res.status(400).send({ auth: false, message: 'Role field is required' })
    }

    if (typeof role !== 'number') {
      updatedUser.details.role = role
    }

    updatedUser = await req.userService.updateUser(updatedUser, updatedUser, 'adm')
    if (updatedUser == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    res.send({ auth: true, message: 'User Successfully Updated' })
  } catch (error) {
    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

/**
 * @openapi
 * paths:
 *  '/api/users/{id}':
 *    delete:
 *      tags:
 *        - Users
 *      summary: Delete an User
 *      description: >
 *        **REQUIRES** Token to validate user <br><br>
 *        This endpoint Deleted an user from the database, deleting also all their books (and respective PDF files).
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: id
 *          required: true
 *          schema:
 *            type: string
 *          description: The user ID
 *          example: "6915857688089552896"
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
    if (req.user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    if (req.user._id !== id) {
      if (req.user.details.role < UserRoles.adm) {
        return res.status(403).send({ auth: false, message: 'Access Denied' })
      }
    }

    await req.userService.deleteUser(id)

    res.send({ auth: true, message: 'User Successfully Deleted' })
  } catch (error) {
    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

export default router
