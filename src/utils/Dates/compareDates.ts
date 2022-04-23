export default function compareDates (date1: Date, date2: Date, justDay?: boolean, justHour?: boolean): boolean {
  if (justDay != null && justHour != null && justDay && justHour) {
    throw new SyntaxError('They can\'t be both true!! Either you compare just the days or just the hours')
  }

  if (justDay != null && justDay) {
    const day1 = date1.toISOString().slice(0, date1.toISOString().indexOf('T'))
    const day2 = date2.toISOString().slice(0, date2.toISOString().indexOf('T'))
    return day1 === day2
  }

  if (justHour != null && justHour) {
    const hour1 = date1.toISOString().slice(date1.toISOString().indexOf('T') + 1)
    const hour2 = date2.toISOString().slice(date2.toISOString().indexOf('T') + 1)
    return hour1 === hour2
  }

  return date1 === date2
}
