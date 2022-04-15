import winston from 'winston'
import { project } from '@config'

const { combine, printf, label, timestamp } = winston.format
const { File } = winston.transports

interface Message {
  level: string
  message: string
  label: string
  timestamp: string
}

/**
 * Make The String to LOG information
 */
const format = printf((args) => {
  const { level, message, label, timestamp } = args as Message
  return `[${label}] ["${level}" | ${timestamp}] ${message}`
})

const saveLogger = winston.createLogger({
  level: 'silly',
  transports: [new File({ filename: project.logPath })],
  format: combine(
    label({ label: project.label }),
    timestamp({ format: 'DD-MM-YYYY - HH:mm:ss' }),
    format
  )
})

export { saveLogger }
