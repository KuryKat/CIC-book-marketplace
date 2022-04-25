import { Response } from 'swagger-jsdoc'

const InternalServerError: Response = {
  description: 'Internal Server Error',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/NegativeResponse'
      }
    }
  }
}

export default InternalServerError
