import { Response } from 'swagger-jsdoc'

const PayloadTooLarge: Response = {
  description: 'Payload Too Large',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/NegativeResponse'
      }
    }
  }
}

export default PayloadTooLarge
