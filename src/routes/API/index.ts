import { Router } from 'express'
import booksRouter from './books'
import usersRouter from './users'

const router = Router()

router.get('/', (_, res) => res.send({ message: 'Hey! The API starts here!' }))
router.use('/books', booksRouter)
router.use('/users', usersRouter)

export default router
