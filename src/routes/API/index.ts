import { Router } from 'express'
import booksRouter from './books'
import usersRouter from './users'
import authRoute from './auth'

const router = Router()

router.get('/', (_, res) => res.send({ message: 'Hey! The API starts here!' }))
router.use('/books', booksRouter)
router.use('/users', usersRouter)
router.use('/auth', authRoute)

export default router
