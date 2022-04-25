import { Book } from '@modules/database/schemas/Book.schema'

export enum UserRoles {
  user,
  seller,
  adm,
  owner
}

/**
 * @openapi
 * components:
 *  schemas:
 *    UserDetails:
 *      nullable: true
 *      type: object
 *      required:
 *        - role
 *        - balance
 *        - booksSold
 *        - purchasedBooks
 *        - dates
 *      properties:
 *        phone:
 *          type: string
 *          nullable: true
 *        role:
 *          type: number
 *          enum:
 *            - user
 *            - seller
 *            - adm
 *            - owner
 *          default: 0
 *        balance:
 *          type: number
 *          default: 0
 *        booksSold:
 *          type: number
 *          default: 0
 *        purchasedBooks:
 *          type: array
 *          default: []
 *          items:
 *            oneOf:
 *              - type: string
 *              - $ref: '#/components/schemas/Book'
 *        dates:
 *          type: object
 *          properties:
 *            lastSeen:
 *              type: string
 *              format: date-time
 *            joined:
 *              type: string
 *              format: date-time
 */
export interface UserDetails {
  phone: string | null
  role: UserRoles
  balance: number
  booksSold: number
  purchasedBooks: string[] | Book[]
  dates: {
    lastSeen: Date
    joined: Date
  }
}

export default interface UserDTO {
  _id: string
  name: string
  email: string
  password: string
  details: UserDetails | undefined
}
