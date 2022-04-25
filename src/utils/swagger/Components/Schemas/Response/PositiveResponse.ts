import { Schema } from 'swagger-jsdoc'

const PositiveResponse: Schema = {
  allOf: [
    {
      $ref: '#/components/schemas/BaseResponseModel'
    },
    {
      required: ['message'],
      properties: {
        message: {
          nullable: false
        }
      },
      example: {
        auth: true,
        message: 'The operation was a success!'
      }
    }
  ]
}

export default PositiveResponse
