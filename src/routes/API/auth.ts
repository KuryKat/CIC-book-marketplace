import { Error as MongooseErrors } from 'mongoose'
import { RequestHandler, Router } from 'express'
import { hash, genSalt, compare } from 'bcryptjs'
import generateID from '@utils/generateID'
import UserDTO from '@modules/database/interfaces/User/User.DTO'
import VerifyToken from '@utils/Middlewares/VerifyToken'
import generateToken from '@utils/generateToken'
import GetUser from '@utils/Middlewares/GetUser'

const router = Router()

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
    await req.userService.createUser(newUser)
    const token = generateToken(_id, name, email)

    return res.send({ auth: true, token })
  } catch (error) {
    if (error instanceof MongooseErrors.ValidationError) {
      const errors = Object.values(error.errors)[0]
      return res.status(400).send({ auth: false, message: `${errors.name} - ${errors.message}` })
    }

    if (error instanceof Error) {
      if (error.message.startsWith('E11000')) {
        return res.status(400).send({ auth: false, message: 'Email already registered' })
      }
    }

    console.error(error)
    return res.status(500).send(
      {
        error: req.app.get('env') === 'development' ? error : {},
        auth: false,
        message: 'Internal Server Error'
      }
    )
  }
}) as RequestHandler)

router.get('/@me', VerifyToken, GetUser, (req, res) => res.send(req.user ?? {}))

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

    const token = generateToken(_id, name, email)

    res.send({ auth: true, token })
  } catch (error) {
    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler)

export default router
