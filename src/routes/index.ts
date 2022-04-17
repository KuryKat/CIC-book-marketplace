import { Router } from 'express'

const router = Router()

router.get('/', (_, res) => res.send({ message: 'Hey! The API starts at the /api!' }))

export default router
