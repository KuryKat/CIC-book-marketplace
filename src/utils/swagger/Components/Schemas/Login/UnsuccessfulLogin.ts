import { Schema } from 'swagger-jsdoc'

const SuccessfulLogin: Schema = {
  allOf: [
    {
      $ref: '#/components/schemas/BaseResponseModel'
    },
    {
      type: 'object',
      required: ['token'],
      properties: {
        token: {
          type: 'string'
        }
      },
      example: {
        auth: false,
        token: null
      }
    }
  ]
}

export default SuccessfulLogin
