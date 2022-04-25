import { Response } from 'swagger-jsdoc'

const Unauthorized: Response = {
  description: 'Unauthorized',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/NegativeResponse'
      }
    }
  }
}

export default Unauthorized
