import { logger } from '@utils/logger'
import { EventEmitter } from 'events'

/**
 * Default callback for cleanUp function
 * @return {Promise<void>}
 */
const defaultCallback = async (): Promise<unknown> => {
  return await new Promise(resolve => {
    resolve(logger('info', 'Exited!'))
  })
}

/**
 * Runs the callback when the process is finished by any cause
 */
const cleanUp = (callback = defaultCallback): void => {
  const cleanUpEmitter = new EventEmitter()

  cleanUpEmitter.on('cleanUp', (): void => {
    (async () => {
      await callback()
      process.exit()
    })()
      .catch(console.error)
  })

  process.on('exit', () => {
    logger('info', 'Bye bye~!')
  })

  process.on('SIGINT', () => {
    logger('warn', 'Ctrl-C...')
    cleanUpEmitter.emit('cleanUp')
  })

  process.on('uncaughtException', err => {
    logger('warn', 'Uncaught Exception...')
    console.error(err)
    logger('error', err)
    cleanUpEmitter.emit('cleanUp')
  })

  process.on('unhandledRejection', (err: Error) => {
    logger('warn', 'Unhandled Rejection...')
    console.error(err)
    logger('error', err)
    cleanUpEmitter.emit('cleanUp')
  })
}

export { cleanUp }
