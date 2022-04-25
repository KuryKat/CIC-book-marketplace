import { Response } from 'swagger-jsdoc'

const Created: Response = {
  description: 'Resource Created.',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/PositiveResponse'
      }
    }
  }
}

export default Created
