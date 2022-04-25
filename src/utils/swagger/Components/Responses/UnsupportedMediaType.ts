import { Response } from 'swagger-jsdoc'

const UnsupportedMediaType: Response = {
  description: 'Unsupported Media Type',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/NegativeResponse'
      }
    }
  }
}

export default UnsupportedMediaType
