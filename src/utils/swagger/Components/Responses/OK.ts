import { Response } from 'swagger-jsdoc'

const OK: Response = {
  description: 'OK',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/PositiveResponse'
      }
    }
  }
}

export default OK
