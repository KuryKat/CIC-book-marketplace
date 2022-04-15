import winston from 'winston'
import { Colorize } from '@utils/colorize'
import { project } from '@config'

const { combine, printf, label, timestamp } = winston.format
const { Console } = winston.transports

// args = { level, message, label, timestamp }
interface Message {
  level: 'error' | 'warn' | 'info'
  message: string
  label: string
  timestamp: string
}

/**
 * Make The String to LOG information (with colors, yay)
 */
const stringMaker = ({ level, message, label, timestamp }: Message): string => {
  const defaultString = (): string => Colorize.colour('cyan', `[${label}]`)

  const levelColor = (): string | undefined => {
    const thisFormat = `["${level.toUpperCase()}" | ${timestamp}]`

    switch (level) {
      case 'error':
        return Colorize.colour('niceRed', thisFormat)
      case 'warn':
        return Colorize.colour('gold', thisFormat)
      case 'info':
        return Colorize.colour('lightgreen', thisFormat)
    }
  }
  const finalFormatted = `${Colorize.colour(
        'BOLD',
        `${defaultString()} ${levelColor() as string} ${message}`
    )}`

  return finalFormatted
}

const format = printf(args => {
  return stringMaker(args as Message)
})

const logger = winston.createLogger({
  level: 'info',
  transports: [new Console()],
  format: combine(
    label({ label: project.label }),
    timestamp({ format: 'HH:mm:ss' }),
    format
  )
})

export { logger }
