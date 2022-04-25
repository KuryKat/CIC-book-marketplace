import swaggerJSDoc, { Options } from 'swagger-jsdoc'
import swaggerUI from 'swagger-ui-express'
import { Express } from 'express'
import { version } from '../../../package.json'
import { logger } from '../logger'

/** Schemas */
import BaseResponseModel from './Components/Schemas/BaseResponseModel'
import SuccessfulLogin from './Components/Schemas/Login/SuccessfulLogin'
import UnsuccessfulLogin from './Components/Schemas/Login/UnsuccessfulLogin'
import PositiveResponse from './Components/Schemas/Response/PositiveResponse'
import NegativeResponse from './Components/Schemas/Response/NegativeResponse'

/** Responses */
import BadRequest from './Components/Responses/BadRequest'
import Conflict from './Components/Responses/Conflict'
import Created from './Components/Responses/Created'
import Forbidden from './Components/Responses/Forbidden'
import InternalServerError from './Components/Responses/InternalServerError'
import NotFound from './Components/Responses/NotFound'
import OK from './Components/Responses/OK'
import PaymentRequired from './Components/Responses/PaymentRequired'
import Unauthorized from './Components/Responses/Unauthorized'
import UnsupportedMediaType from './Components/Responses/UnsupportedMediaType'

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Book Marketplace - Backend',
      version,
      description: `This backend was created for a job application test provided by [CIC](https://perdcomp.com.br/)
      <br><br>
      All the IDs on this project utilizes Twitter's [snowflake](https://github.com/twitter-archive/snowflake/tree/snowflake-2010) format
      `,
      contact: {
        name: 'KuryKat',
        email: 'amaroalexcavalcanti@gmail.com',
        url: 'https://github.com/KuryKat'
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        BaseResponseModel,
        SuccessfulLogin,
        UnsuccessfulLogin,
        PositiveResponse,
        NegativeResponse
      },
      responses: {
        BadRequest,
        Conflict,
        Created,
        Forbidden,
        InternalServerError,
        NotFound,
        OK,
        PaymentRequired,
        Unauthorized,
        UnsupportedMediaType
      }
    },
    security: [{
      bearerAuth: []
    }],
    tags: [
      { name: 'Users', description: 'Operations about users' },
      { name: 'Books', description: 'Operations about books' },
      { name: 'Auth', description: 'Operations about authentication and security' }
    ]
  },
  apis: [
    './src/routes/**/*.ts',
    './src/modules/**/*.ts'
  ]
}

const swaggerSpec = swaggerJSDoc(options)

export default function swaggerDocs (app: Express): void {
  app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec))
  app.use('/docs.json', (_, res) => res.json(swaggerSpec))
  logger('info', '[DOCS] Docs served successfully')
}
