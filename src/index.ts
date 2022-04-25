import express, { Request, Response, NextFunction } from 'express'
import createError, { HttpError } from 'http-errors'
import { cleanUp } from '@utils/cleanUp'
import { createBackupLog } from '@utils/logger/createBackup'
import { logger } from '@utils/logger'
import { join, dirname } from 'path'
import { project, server } from '@config'
import DatabaseService from '@database'
import BookService from '@modules/database/services/Book.service'
import UserService from '@modules/database/services/User.service'
import fileUpload from 'express-fileupload'

// Routes Import
import indexRouter from '@routes/index'
import apiRouter from '@routes/API'

const app = express()
app.use(express.json())
app.use(fileUpload({ abortOnLimit: true }))
app.set('env', project.env)

// CleanUp Process when application ends, creating the log backup!
cleanUp(async () => {
  logger('warn', 'WARNING: Finishing the server')
  await createBackupLog(project.logPath, join(dirname(project.logPath), 'log.log.gz'))
})

logger('info', 'STARTING APPLICATION')
logger('info', 'Running on NodeJS: ' + process.version)

const db = new DatabaseService()
db.build()
const bookService = new BookService(db.BookModel)
app.request.bookService = bookService
app.request.userService = new UserService(db.UserModel, bookService)

// Routes Use
app.use('/', indexRouter)
app.use('/api', apiRouter)

// catch 404 and forward to error handler
app.use((_req, _res, next) => {
  next(createError(404))
})

// Error Handler
app.use((error: Error | HttpError | unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    return res.status(error.status).send({ auth: false, message: error.message })
  }

  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return res.status(400).send({ auth: false, message: `You sent an invalid JSON - ${error.message}` })
  }

  logger('error', (error as Error).message)
  console.error(error)
  return res.status(500).send({ auth: false, message: 'Internal Server Error' })
})

app.listen(server.port, () => logger('info', '[API] Running on port ' + String(server.port)))
