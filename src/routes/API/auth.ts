import { Error as MongooseErrors } from 'mongoose'
import { RequestHandler, Router } from 'express'
import { hash, genSalt, compare } from 'bcryptjs'
import generateID from '@utils/generateID'
import UserDTO from '@modules/database/interfaces/User/User.DTO'
import ValidateToken from '@utils/Middlewares/ValidateToken'
import generateToken from '@utils/generateToken'
import GetUser from '@utils/Middlewares/GetUser'
import UpdateLastSeen, { UpdateLastSeenInsideHandler } from '@utils/Middlewares/UpdateLastSeen'
import { logger } from '@utils/logger'

const router = Router()

/**
 * @openapi
 * paths:
 *  '/api/auth/register':
 *    post:
 *      tags:
 *        - Auth
 *      summary: Register an user and generate an access token
 *      description: >
 *        This endpoint **require** a correct Body to work,
 *        otherwise it will return ___400___ for missing fields or duplicated emails
 *      requestBody:
 *        description: Data  **required** for user creation
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - name
 *                - email
 *                - password
 *              properties:
 *                name:
 *                  type: string
 *                email:
 *                  type: string
 *                  format: email
 *                password:
 *                  type: string
 *                  format: password
 *              example:
 *                name: "Kury"
 *                email: "kury@mail.co"
 *                password: "fries123"
 *      responses:
 *        201:
 *          allOf:
 *            - $ref: '#/components/responses/Created'
 *            - content:
 *                application/json:
 *                  schema:
 *                    $ref: '#/components/schemas/SuccessfulLogin'
 *        400:
 *          $ref: '#/components/responses/BadRequest'
 *        409:
 *          $ref: '#/components/responses/Conflict'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.post('/register', (async (req, res) => {
  try {
    const { password, name, email } = req.body

    if (password == null) {
      return res.status(400).send({ auth: false, message: 'Password field is required' })
    }
    if (name == null) {
      return res.status(400).send({ auth: false, message: 'Name field is required' })
    }
    if (email == null) {
      return res.status(400).send({ auth: false, message: 'Email field is required' })
    }

    const salt = await genSalt()
    const hashedPass = await hash(password, salt)
    const _id = generateID()
    const newUser: UserDTO = {
      _id,
      name,
      email,
      password: hashedPass,
      details: undefined
    }
    const user = await req.userService.createUser(newUser)
    const token = generateToken(_id, name)

    req.user = user
    return res.status(201).send({ auth: true, token })
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
    return res.status(500).send({ auth: false, message: 'Internal Server Error' }
    )
  }
}) as RequestHandler)

/**
 * @openapi
 * paths:
 *  '/api/auth/@me':
 *    get:
 *      tags:
 *        - Auth
 *      summary: Get information about your user on the database
 *      description: >
 *        **REQUIRES** Token to validate user
 *      security:
 *        - bearerAuth: []
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
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.get('/@me', ValidateToken, GetUser, UpdateLastSeen, (req, res) => res.send(req.user ?? {}))

/**
 * @openapi
 * paths:
 *  '/api/auth/login':
 *    post:
 *      tags:
 *        - Auth
 *      summary: Make Login to generate an access token
 *      description: >
 *        This endpoint **require** a correct Body to work,
 *        otherwise it will return ___400___ for missing fields or duplicated emails
 *      requestBody:
 *        description: Data  **required** for login
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - email
 *                - password
 *              properties:
 *                email:
 *                  type: string
 *                  format: email
 *                password:
 *                  type: string
 *                  format: password
 *              example:
 *                email: "kury@mail.co"
 *                password: "fries123"
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
 *        default:
 *          $ref: '#/components/responses/InternalServerError'
 */
router.post('/login', (async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await req.userService.getUserByEmail(email)

    if (user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    const { _id, name } = user

    const validPass = await compare(password, user.password)

    if (!validPass) {
      return res.status(401).send({ auth: false, token: null })
    }

    const token = generateToken(_id, name)

    req.user = await req.userService.getUserByID(user._id)
    await UpdateLastSeenInsideHandler(user, req.userService)
    res.send({ auth: true, token })
  } catch (error) {
    logger('error', (error as Error).message)
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

export default router
