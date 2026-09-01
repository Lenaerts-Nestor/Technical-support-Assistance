/** One returned device: a serial plus the product it belongs to. */
export type RmaUnit = {
  id: string
  serial: string
  productName: string
}

/** The single-value fields of the RMA form, in the order they are copied. */
export type RmaDetailField =
  | 'issueDescription'
  | 'projectReference'
  | 'companyName'
  | 'deliveryContact'
  | 'address'
  | 'city'
  | 'postalCode'
  | 'country'

export type RmaDetails = Record<RmaDetailField, string>

/** A first-level issue category and the second-level issues under it. */
export type IssueCategory = {
  id: string
  label: string
  issues: string[]
}
