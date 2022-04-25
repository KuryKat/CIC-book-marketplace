import { Response } from 'swagger-jsdoc'

const Forbidden: Response = {
  description: 'Forbidden',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/NegativeResponse'
      }
    }
  }
}

export default Forbidden
