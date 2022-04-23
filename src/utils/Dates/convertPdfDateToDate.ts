export default function convertPDFDateToDate (pdfDate: string): Date {
  const slicedPdfDate = pdfDate.slice(2)
  const pdfDateYear = slicedPdfDate.slice(0, 4)
  const pdfDateMonth = slicedPdfDate.slice(4, 6)
  const pdfDateDay = slicedPdfDate.slice(6, 8)
  const pdfDateHour = slicedPdfDate.slice(8, 10)
  const pdfDateMinute = slicedPdfDate.slice(10, 12)
  const pdfDateSecond = slicedPdfDate.slice(12, 14)

  return new Date(`${pdfDateYear}-${pdfDateMonth}-${pdfDateDay}T${pdfDateHour}:${pdfDateMinute}:${pdfDateSecond}.000Z`)
}
