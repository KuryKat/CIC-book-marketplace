import { Router } from 'express'
import booksRouter from './books'

const router = Router()

router.get('/', (_, res) => res.send({ message: 'Hey! The API starts here!' }))
router.get('/books', booksRouter)

export default router
