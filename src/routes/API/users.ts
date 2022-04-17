import { Router } from 'express'

const router = Router()

router.get('/', (_, res) => res.send({ message: 'Hey! The Users!' }))

export default router
