import { Response } from 'swagger-jsdoc'

const Conflict: Response = {
  description: 'Conflict',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/NegativeResponse'
      }
    }
  }
}

export default Conflict
