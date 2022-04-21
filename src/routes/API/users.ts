import { User } from '@modules/database/schemas/User.schema'
import { RequestHandler, Router } from 'express'
import { JsonWebTokenError, JwtPayload, verify } from 'jsonwebtoken'
import { hash, genSalt } from 'bcryptjs'
import { JWT } from '@config'
import { UserRoles } from '@modules/database/interfaces/User/User.DTO'
import ValidateToken from '@utils/Middlewares/ValidateToken'
import GetUser from '@utils/Middlewares/GetUser'
import generateToken from '@utils/generateToken'

const router = Router()

router.get('/', (async (req, res) => {
  try {
    const { search, sort, page, limit } = req.query
    const { authorization } = req.headers
    let results: User[] = []
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

      showAll = user.details.role >= UserRoles.adm
    }

    const queryPage = Number.parseInt(page as string)
    const queryLimit = Number.parseInt(limit as string)
    const pageNum = Number.isNaN(queryPage) ? 1 : queryPage < 1 ? 1 : queryPage
    const limitNum = Number.isNaN(queryLimit) ? 1 : queryLimit < 1 ? 1 : (queryLimit > 10) ? 10 : queryLimit

    if (sort != null && typeof sort === 'string') {
      results = await req.userService.getUser(search as string ?? '', showAll, sort, pageNum, limitNum)
    } else {
      results = await req.userService.getUser(search as string ?? '', showAll)
    }

    return res.json(results)
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      return res.status(401).send({ auth: false, message: 'Invalid Token.' })
    }

    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

router.get('/:id', (async (req, res) => {
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

    showAll = user._id === id || user.details.role >= UserRoles.adm
  }

  const user = await req.userService.getUserByID(id, showAll)
  res.send(user)
}) as RequestHandler)

router.get('/:id/books', (async (req, res) => {
  const { id } = req.params
  const books = await req.bookService.getBooksBySeller(id)
  res.send(books)
}) as RequestHandler)

router.patch('/@me', ValidateToken, GetUser, (async (req, res) => {
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

    const token = generateToken(updatedUser._id, updatedUser.name, updatedUser.email)
    res.send({ auth: true, token })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('E11000')) {
        return res.status(400).send({ auth: false, message: 'Email already registered' })
      }
    }
  }
}) as RequestHandler)

export default router
