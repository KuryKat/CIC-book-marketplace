import moment from 'moment'
import { open, writeFile } from 'fs/promises'
import { createReadStream, createWriteStream, PathLike } from 'fs'
import { promisify } from 'util'
import { createGzip } from 'zlib'
import { pipeline } from 'stream'

import { logger } from '@utils/logger'

interface fsError extends Error {
  code: string
}

/**
 * Create a new file name
 */
const createFileName = async (defaultName: PathLike): Promise<string> => {
  const checkifExist = async (name: PathLike): Promise<boolean> => {
    let result = false
    try {
      const operation = await open(name, 'r')
      if (operation.fd === 4) result = true
      await operation.close()
    } catch (error) {
      const { code, message } = error as fsError

      if ((code === 'ENOENT')) result = false
      else {
        logger('error', `Error checking if file exists: ${message}`)
      }
    }
    return result
  }

  const nameGen = (): string => {
    const timestamp = moment(new Date(), true).format('YYYY-MM-DD(HH_mm_ss)')

    const indexOfExtension = (defaultName as string).indexOf('.log.gz')

    const fileName = (defaultName as string).slice(0, indexOfExtension)
    const extension = (defaultName as string).slice(indexOfExtension)
    return `${fileName}-${timestamp}${extension}`
  }

  let newFileName = nameGen()
  let exist = await checkifExist(newFileName)
  while (exist) {
    newFileName = nameGen()
    exist = await checkifExist(newFileName)
  }
  return newFileName
}

/**
 * Create a GZip file to save the backup log
 */
const makeGZip = async (input: PathLike, output: PathLike): Promise<void> => {
  const fileName = await createFileName(output)
  const pipe = promisify(pipeline)
  await pipe(
    createReadStream(input),
    createGzip(),
    createWriteStream(fileName)
  )
}

/**
 * Create a Log file to make log history
 */
const createBackupLog = async (latestLogPath: PathLike, backupLogPath: PathLike): Promise<void> => {
  try {
    logger('warn', 'Making the log file to backup...')
    await makeGZip(latestLogPath, backupLogPath)
    logger('info', 'Log file created! Backup Done!')
    writeFile(latestLogPath, '')
      .catch(console.error)
  } catch (error) {
    const { message } = error as fsError
    logger('error', 'Error when trying to backup the latest log: ' + message)
  }
}

export { createBackupLog }
