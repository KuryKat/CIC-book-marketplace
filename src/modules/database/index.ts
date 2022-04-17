import mongoose, { model } from 'mongoose'
import { database } from '@config'
import { logger } from '@utils/logger'
import { bookSchema } from '@modules/database/schemas/Book.schema'
import { userSchema } from '@modules/database/schemas/User.schema'

export default class DatabaseService {
  build (): void {
    mongoose.connect(database.mongo.url)
      .catch(console.error)

    const db = mongoose.connection
    db.on('open', () => logger('info', '[DATABASE] Connection to MongoDB successful!'))
    db.on('error', console.error)
  }

  readonly BookModel = model('books', bookSchema)
  readonly UserModel = model('users', userSchema)
}
