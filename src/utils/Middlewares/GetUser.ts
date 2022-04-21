import { RequestHandler } from 'express'

export default (async (req, res, next) => {
  const user = await req.userService.getUserByID(req.userID ?? '', true)
  if (user == null) {
    return res.status(404).send({ auth: false, message: 'User Not Found' })
  }

  req.user = user
  next()
}) as RequestHandler
