import { Response } from 'swagger-jsdoc'

const BadRequest: Response = {
  description: 'Bad Request | Your Request was malformed, check the response body.',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/NegativeResponse'
      }
    }
  }
}

export default BadRequest
