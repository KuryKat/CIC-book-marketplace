import { RequestHandler, Router } from 'express'
import { JsonWebTokenError, JwtPayload, verify } from 'jsonwebtoken'
import { hash, genSalt } from 'bcryptjs'
import { JWT } from '@config'
import { UserRoles } from '@modules/database/interfaces/User/User.DTO'
import ValidateToken from '@utils/Middlewares/ValidateToken'
import GetUser from '@utils/Middlewares/GetUser'
import generateToken from '@utils/generateToken'
import UpdateLastSeen, { UpdateLastSeenInsideHandler } from '@utils/Middlewares/UpdateLastSeen'

const router = Router()

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

    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

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

    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

router.get('/:id/books', (async (req, res) => {
  const { id } = req.params
  const books = await req.bookService.getBooksBySeller(id)

  if (req.user != null) {
    await UpdateLastSeenInsideHandler(req.user, req.userService)
  }

  res.send(books)
}) as RequestHandler)

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

    const token = generateToken(updatedUser._id, updatedUser.name, updatedUser.email)
    res.send({ auth: true, token })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('E11000')) {
        return res.status(400).send({ auth: false, message: 'Email already registered' })
      }
    }

    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

router.patch('/:id', ValidateToken, GetUser, UpdateLastSeen, (async (req, res) => {
  try {
    const { id } = req.params
    if (req.user == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    if (req.user.details.role < UserRoles.adm) {
      return res.status(401).send({ auth: false, message: 'Access Denied' })
    }

    let updatedUser = await req.userService.getUserByID(id)
    if (updatedUser == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    const { role } = req.body

    if (role != null && !(isNaN(role))) {
      updatedUser.details.role = role
    }

    updatedUser = await req.userService.updateUser(req.user, updatedUser, 'adm')
    if (updatedUser == null) {
      return res.status(404).send({ auth: false, message: 'User Not Found' })
    }

    res.send(updatedUser)
  } catch (error) {
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

export default router
