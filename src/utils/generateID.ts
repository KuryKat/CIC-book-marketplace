import { Snowflake } from 'nodejs-snowflake'

const uid = new Snowflake({
  instance_id: 3802,
  custom_epoch: 1650240000
})

export default function generateID (): string {
  return uid.getUniqueID().toString()
}
