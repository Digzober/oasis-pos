import { describe, it, expect } from 'vitest'
import { isBarcodeInput, classifyBarcode } from '../barcodeDetector'

describe('isBarcodeInput', () => {
  it('identifies 12-digit UPC as barcode', () => {
    expect(isBarcodeInput('012345678901')).toBe(true)
  })

  it('identifies 16-digit BioTrack as barcode', () => {
    expect(isBarcodeInput('0123456789012345')).toBe(true)
  })

  it('identifies 8-digit UPC-E as barcode', () => {
    expect(isBarcodeInput('01234567')).toBe(true)
  })

  it('identifies 13-digit EAN as barcode', () => {
    expect(isBarcodeInput('0123456789012')).toBe(true)
  })

  it('rejects text input "blue dream"', () => {
    expect(isBarcodeInput('blue dream')).toBe(false)
  })

  it('rejects short number "123"', () => {
    expect(isBarcodeInput('123')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isBarcodeInput('')).toBe(false)
  })

  it('rejects alphanumeric SKU', () => {
    expect(isBarcodeInput('SKU-12345')).toBe(false)
  })
})

describe('classifyBarcode', () => {
  it('classifies 16-digit starting with 0 as biotrack', () => {
    expect(classifyBarcode('0123456789012345')).toBe('biotrack')
  })

  it('classifies 16-digit as biotrack', () => {
    expect(classifyBarcode('1234567890123456')).toBe('biotrack')
  })

  it('classifies 12-digit as upc', () => {
    expect(classifyBarcode('012345678901')).toBe('upc')
  })

  it('classifies 13-digit as ean', () => {
    expect(classifyBarcode('0123456789012')).toBe('ean')
  })

  it('classifies 8-digit as upc', () => {
    expect(classifyBarcode('01234567')).toBe('upc')
  })

  it('classifies alphanumeric string as sku', () => {
    expect(classifyBarcode('SKU-123')).toBe('sku')
  })

  it('classifies string with special chars as unknown', () => {
    expect(classifyBarcode('hello world!')).toBe('unknown')
  })
})
