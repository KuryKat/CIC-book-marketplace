import { Response } from 'swagger-jsdoc'

const NotFound: Response = {
  description: 'Not Found',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/NegativeResponse'
      }
    }
  }
}

export default NotFound
