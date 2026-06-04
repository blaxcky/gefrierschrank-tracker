export const UNITS = ['Stück', 'g', 'kg', 'Packung', 'Beutel', 'Dose', 'Portion']

export function formatUnit(quantity: number, unit: string) {
  if (unit === 'Portion') {
    return quantity === 1 ? 'Portion' : 'Portionen'
  }

  return unit
}

export function formatQuantity(quantity: number, unit: string) {
  return `${quantity} ${formatUnit(quantity, unit)}`
}
