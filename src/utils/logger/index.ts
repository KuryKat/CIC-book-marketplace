import { logger as consoleLogger } from './logger'
import { saveLogger } from './saveLogger'

/**
 * Make Logs:
 * * Print in console (with colors o.O)
 * * Save in file
 */
const logger = (type: 'error' | 'warn' | 'help' | 'data' | 'info' | 'debug' | 'prompt' | 'http' | 'verbose' | 'input' | 'silly', text: string | Error): void => {
  saveLogger.log(type, text)
  consoleLogger.log(type, text)
}

export { logger }
