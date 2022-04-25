import HTTPError from './HTTPError'

export default class ParseError extends HTTPError {
  type!: string
  body!: string
}
