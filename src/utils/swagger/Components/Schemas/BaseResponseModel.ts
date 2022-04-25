import { Schema } from 'swagger-jsdoc'

const BaseResponseModel: Schema = {
  type: 'object',
  required: ['auth'],
  properties: {
    auth: {
      type: 'boolean'
    },
    message: {
      type: 'string',
      nullable: true
    }
  }
}

export default BaseResponseModel
