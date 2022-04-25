import { Response } from 'swagger-jsdoc'

const PaymentRequired: Response = {
  description: 'Payment Required',
  content: {
    'application/json': {
      schema: {
        $ref: '#/components/schemas/NegativeResponse'
      }
    }
  }
}

export default PaymentRequired
