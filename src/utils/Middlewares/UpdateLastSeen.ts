import { User } from '@modules/database/schemas/User.schema'
import UserService from '@modules/database/services/User.service'
import { RequestHandler } from 'express'

export default (async (req, res, next) => {
  if (req.user == null) {
    return next()
  }

  const lastSeen = new Date()
  req.user.details.dates.lastSeen = lastSeen
  await req.userService.updateUser(req.user, req.user, 'auto')

  return next()
}) as RequestHandler

export async function UpdateLastSeenInsideHandler (user: User, userService: UserService): Promise<void> {
  const lastSeen = new Date()
  user.details.dates.lastSeen = lastSeen
  await userService.updateUser(user, user, 'auto')
}
