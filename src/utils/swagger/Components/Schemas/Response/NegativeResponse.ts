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
        auth: false,
        message: 'Unexpected (or expected) Error!'
      }
    }
  ]
}

export default PositiveResponse
