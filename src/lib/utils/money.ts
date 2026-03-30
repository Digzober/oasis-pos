export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function centsToDecimal(cents: number): number {
  return roundMoney(cents / 100)
}

export function decimalToCents(amount: number): number {
  return Math.round(amount * 100)
}
