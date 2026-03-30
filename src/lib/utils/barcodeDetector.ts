export function isBarcodeInput(input: string): boolean {
  if (!input || input.length < 8 || input.length > 20) return false
  return /^\d{8,16}$/.test(input)
}

export function classifyBarcode(
  barcode: string,
): 'biotrack' | 'upc' | 'ean' | 'sku' | 'unknown' {
  if (/^\d{16}$/.test(barcode) && barcode.startsWith('0')) return 'biotrack'
  if (/^\d{16}$/.test(barcode)) return 'biotrack' // BioTrack doesn't always start with 0
  if (/^\d{12}$/.test(barcode)) return 'upc'
  if (/^\d{13}$/.test(barcode)) return 'ean'
  if (/^\d{8}$/.test(barcode)) return 'upc'
  if (/^[A-Za-z0-9-]{1,20}$/.test(barcode)) return 'sku'
  return 'unknown'
}
