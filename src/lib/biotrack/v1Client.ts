import { logger } from '@/lib/utils/logger'
import { BioTrackError } from './types'

/**
 * BioTrack v1 (XML/SOAP) client for NM-specific operations.
 * NM BioTrack uses the XML API at mcp-tracking.nmhealth.org/serverxml.asp
 * for operations like allotment checks that aren't available on v3 REST.
 *
 * The v1 API uses SOAP XML with a simple request/response pattern.
 * All requests go to the same endpoint; the operation is specified in the XML body.
 */

const RETRY_DELAYS = [1000, 2000, 4000]

interface V1Config {
  url: string
  username: string
  password: string
  ubi: string
  locationId: string
}

interface V1Response {
  success: boolean
  data: Record<string, unknown>
  rawXml: string
  error: string | null
}

/**
 * Builds SOAP XML envelope for BioTrack v1 API calls.
 * The v1 API expects a specific XML structure with credentials in each request.
 */
function buildSoapEnvelope(operation: string, params: Record<string, string>, config: V1Config): string {
  const paramXml = Object.entries(params)
    .map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`)
    .join('\n    ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${operation}>
      <username>${escapeXml(config.username)}</username>
      <password>${escapeXml(config.password)}</password>
      <UBI>${escapeXml(config.ubi)}</UBI>
      <location>${escapeXml(config.locationId)}</location>
    ${paramXml}
    </${operation}>
  </soap:Body>
</soap:Envelope>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Parses a BioTrack v1 XML response into a structured object.
 * The v1 API returns XML with a predictable structure:
 * <response><success>1|0</success><data>...</data><error>...</error></response>
 *
 * We use regex parsing instead of a full XML parser to avoid adding dependencies.
 * The v1 response format is simple enough that regex is reliable here.
 */
function parseV1Response(xml: string): V1Response {
  const successMatch = xml.match(/<success>(\d)<\/success>/)
  const errorMatch = xml.match(/<error>(.*?)<\/error>/s)

  const success = successMatch?.[1] === '1'
  const error = errorMatch?.[1]?.trim() || null

  // Extract key/value pairs from the response data
  const data: Record<string, unknown> = {}
  const dataMatch = xml.match(/<data>(.*?)<\/data>/s)
  if (dataMatch?.[1]) {
    const tagPattern = /<(\w+)>(.*?)<\/\1>/gs
    let match
    while ((match = tagPattern.exec(dataMatch[1])) !== null) {
      data[match[1]!] = match[2]
    }
  }

  // Also check for row-based data (inventory lookups, allotment checks)
  const rows: Record<string, unknown>[] = []
  const rowPattern = /<row>(.*?)<\/row>/gs
  let rowMatch
  while ((rowMatch = rowPattern.exec(xml)) !== null) {
    const row: Record<string, unknown> = {}
    const fieldPattern = /<(\w+)>(.*?)<\/\1>/gs
    let fieldMatch
    while ((fieldMatch = fieldPattern.exec(rowMatch[1]!)) !== null) {
      row[fieldMatch[1]!] = fieldMatch[2]
    }
    rows.push(row)
  }

  if (rows.length > 0) {
    data.rows = rows
  }

  return { success, data, rawXml: xml, error }
}

export class BioTrackV1Client {
  private config: V1Config

  constructor(config: V1Config) {
    this.config = config
  }

  /**
   * Makes a v1 SOAP API call with retry logic.
   */
  async call(operation: string, params: Record<string, string> = {}): Promise<V1Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        const envelope = buildSoapEnvelope(operation, params, this.config)

        const res = await fetch(this.config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            SOAPAction: operation,
          },
          body: envelope,
        })

        const xml = await res.text()

        if (!res.ok) {
          throw new BioTrackError(
            `BioTrack v1 HTTP error: ${res.status} ${res.statusText}`,
            res.status,
          )
        }

        const parsed = parseV1Response(xml)

        if (!parsed.success) {
          throw new BioTrackError(
            parsed.error ?? `BioTrack v1 operation failed: ${operation}`,
            400,
            parsed.error,
          )
        }

        return parsed
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        if (attempt < RETRY_DELAYS.length) {
          const delay = RETRY_DELAYS[attempt]!
          logger.warn('BioTrack v1 call failed, retrying', {
            operation,
            attempt: attempt + 1,
            delay,
            error: lastError.message,
          })
          await new Promise((r) => setTimeout(r, delay))
        }
      }
    }

    throw lastError ?? new BioTrackError(`BioTrack v1 ${operation} failed after retries`)
  }

  /**
   * Check patient allotment against BioTrack.
   * NM requires allotment verification before completing a cannabis sale.
   * Returns remaining grams the patient can purchase.
   */
  async checkAllotment(patientId: string): Promise<{
    allowed: boolean
    remainingGrams: number
    usedGrams: number
    limitGrams: number
    message: string | null
  }> {
    try {
      const response = await this.call('allotment_check', {
        patient_id: patientId,
      })

      const remaining = parseFloat(String(response.data.remaining_grams ?? '0'))
      const used = parseFloat(String(response.data.used_grams ?? '0'))
      const limit = parseFloat(String(response.data.limit_grams ?? '56.7'))

      return {
        allowed: remaining > 0,
        remainingGrams: remaining,
        usedGrams: used,
        limitGrams: limit,
        message: response.data.message as string | null,
      }
    } catch (err) {
      logger.error('Allotment check failed', { patientId, error: String(err) })

      // Fail open: if BioTrack is down, allow the sale but log a warning.
      // The budtender can verify allotment manually from the BioTrack portal.
      return {
        allowed: true,
        remainingGrams: 0,
        usedGrams: 0,
        limitGrams: 0,
        message: 'Allotment check unavailable; verify manually',
      }
    }
  }

  /**
   * Lookup inventory by barcode in BioTrack.
   * Returns the BioTrack record for a specific package/barcode.
   */
  async lookupInventory(barcode: string): Promise<{
    found: boolean
    inventoryType: string | null
    quantity: number
    strainName: string | null
    labResults: Record<string, unknown> | null
  }> {
    try {
      const response = await this.call('inventory_lookup', {
        barcode,
      })

      const rows = (response.data.rows as Record<string, unknown>[]) ?? []
      if (rows.length === 0) {
        return { found: false, inventoryType: null, quantity: 0, strainName: null, labResults: null }
      }

      const item = rows[0]!
      return {
        found: true,
        inventoryType: String(item.inventorytype ?? ''),
        quantity: parseFloat(String(item.remaining_quantity ?? '0')),
        strainName: item.strain as string | null,
        labResults: item.lab_results as Record<string, unknown> | null,
      }
    } catch (err) {
      logger.error('Inventory lookup failed', { barcode, error: String(err) })
      return { found: false, inventoryType: null, quantity: 0, strainName: null, labResults: null }
    }
  }

  /**
   * Report a sale to BioTrack v1 (XML API).
   * Some NM operations still require the XML endpoint.
   */
  async reportSale(params: {
    transactionId: string
    patientType: 'recreational' | 'medical'
    patientId: string | null
    items: Array<{
      barcode: string
      quantity: string
      price: string
    }>
  }): Promise<{ saleId: string | null }> {
    const itemParams: Record<string, string> = {}
    params.items.forEach((item, i) => {
      itemParams[`barcode_${i + 1}`] = item.barcode
      itemParams[`quantity_${i + 1}`] = item.quantity
      itemParams[`price_${i + 1}`] = item.price
    })

    const response = await this.call('sale_dispense', {
      transaction_id: params.transactionId,
      patient_type: params.patientType === 'medical' ? '1' : '0',
      patient_id: params.patientId ?? '',
      item_count: String(params.items.length),
      ...itemParams,
    })

    return {
      saleId: response.data.sale_id as string | null,
    }
  }
}
