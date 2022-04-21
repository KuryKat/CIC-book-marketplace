import { RequestHandler } from 'express'
import { JsonWebTokenError, JwtPayload, verify } from 'jsonwebtoken'
import { JWT } from '@config'

export default (async (req, res, next) => {
  try {
    const { authorization } = req.headers

    const token = authorization?.split(' ')[1]

    if (token == null) {
      return res.status(401).send({ auth: false, message: 'No token provided.' })
    }

    const decoded = verify(token, JWT.secret) as JwtPayload
    req.userID = decoded._id

    next()
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      return res.status(401).send({ auth: false, message: 'Invalid Token.' })
    }

    console.error(error)
    return res.status(500).send({ auth: false, message: 'Internal Server Error' })
  }
}) as RequestHandler
