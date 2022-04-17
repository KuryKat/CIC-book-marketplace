import { Router } from 'express'

const router = Router()

router.get('/', (_, res) => res.send({ message: 'Hey! The Books!' }))

export default router
