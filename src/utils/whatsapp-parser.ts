/**
 * WhatsApp Message Parser
 * Parses order messages from WhatsApp into structured order data
 * Supports multiple formats and fuzzy product matching
 */

interface ParsedItem {
  rawText: string
  productName: string
  quantity: number
  confidence: number // 0-1 score for fuzzy match quality
  matchedProductId?: string
  matchedProductName?: string
}

interface Product {
  id: string
  name: string
  price: number
  quantity: number
}

interface ParseResult {
  items: ParsedItem[]
  unparsedLines: string[]
  totalItems: number
}

/**
 * Parse a WhatsApp message into order items
 * Supports formats:
 * - "1x Coca Cola" or "1 x Coca Cola"
 * - "Coca Cola x1" or "Coca Cola x 1"
 * - "Coca Cola (1)" or "Coca Cola 1"
 * - "2 Coca Cola"
 * - Just "Coca Cola" (defaults to quantity 1)
 */
export function parseWhatsAppMessage(message: string): ParseResult {
  const lines = message
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  const items: ParsedItem[] = []
  const unparsedLines: string[] = []

  for (const line of lines) {
    const parsed = parseOrderLine(line)
    if (parsed) {
      items.push(parsed)
    } else {
      // Skip common non-order lines
      const lowerLine = line.toLowerCase()
      const isNonOrderLine =
        lowerLine.includes('thanks') ||
        lowerLine.includes('thank you') ||
        lowerLine.includes('please') ||
        lowerLine.includes('order:') ||
        lowerLine.includes('delivery') ||
        lowerLine.includes('address') ||
        line.length < 3

      if (!isNonOrderLine) {
        unparsedLines.push(line)
      }
    }
  }

  return {
    items,
    unparsedLines,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

/**
 * Parse a single line into an order item
 */
function parseOrderLine(line: string): ParsedItem | null {
  // Pattern 1: "2x Coca Cola" or "2 x Coca Cola"
  let match = line.match(/^(\d+)\s*x\s*(.+)$/i)
  if (match) {
    return {
      rawText: line,
      productName: match[2].trim(),
      quantity: parseInt(match[1]),
      confidence: 1.0,
    }
  }

  // Pattern 2: "Coca Cola x2" or "Coca Cola x 2"
  match = line.match(/^(.+?)\s*x\s*(\d+)$/i)
  if (match) {
    return {
      rawText: line,
      productName: match[1].trim(),
      quantity: parseInt(match[2]),
      confidence: 1.0,
    }
  }

  // Pattern 3: "Coca Cola (2)" or "Coca Cola(2)"
  match = line.match(/^(.+?)\s*\((\d+)\)$/i)
  if (match) {
    return {
      rawText: line,
      productName: match[1].trim(),
      quantity: parseInt(match[2]),
      confidence: 0.95,
    }
  }

  // Pattern 4: "2 Coca Cola" (number at start without 'x')
  match = line.match(/^(\d+)\s+(.+)$/)
  if (match) {
    const productName = match[2].trim()
    // Avoid false positives like "123 Main Street"
    if (productName.length > 3 && !productName.match(/^\d+/)) {
      return {
        rawText: line,
        productName,
        quantity: parseInt(match[1]),
        confidence: 0.85,
      }
    }
  }

  // Pattern 5: Just product name (defaults to quantity 1)
  // Must be at least 3 characters and not start with a number
  if (line.length >= 3 && !line.match(/^\d/)) {
    return {
      rawText: line,
      productName: line.trim(),
      quantity: 1,
      confidence: 0.7,
    }
  }

  return null
}

/**
 * Calculate similarity between two strings (Levenshtein distance)
 * Returns a score from 0 (no match) to 1 (perfect match)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  // Exact match
  if (s1 === s2) return 1.0

  // Contains match (partial)
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length)
    const shorter = Math.min(s1.length, s2.length)
    return 0.7 + (shorter / longer) * 0.3
  }

  // Levenshtein distance
  const matrix: number[][] = []

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  const maxLength = Math.max(s1.length, s2.length)
  const distance = matrix[s2.length][s1.length]
  return Math.max(0, 1 - distance / maxLength)
}

/**
 * Match parsed items to actual products using fuzzy matching
 */
export function matchProductsToItems(
  parsedItems: ParsedItem[],
  products: Product[]
): ParsedItem[] {
  return parsedItems.map(item => {
    let bestMatch: Product | null = null
    let bestScore = 0

    for (const product of products) {
      const score = stringSimilarity(item.productName, product.name)
      if (score > bestScore) {
        bestScore = score
        bestMatch = product
      }
    }

    // Only consider it a match if score is above threshold
    if (bestMatch && bestScore >= 0.6) {
      return {
        ...item,
        matchedProductId: bestMatch.id,
        matchedProductName: bestMatch.name,
        confidence: item.confidence * bestScore,
      }
    }

    return item
  })
}

/**
 * Format parsed items for display
 */
export function formatParsedItems(items: ParsedItem[]): string {
  return items
    .map(item => {
      const matched = item.matchedProductName
        ? `→ ${item.matchedProductName}`
        : '(no match found)'
      const confidence = Math.round(item.confidence * 100)
      return `${item.quantity}x ${item.productName} ${matched} [${confidence}%]`
    })
    .join('\n')
}

/**
 * Example usage and test cases
 */
export const exampleMessages = {
  format1: `2x Coca Cola
1x Pepsi
3 x Water`,

  format2: `Coca Cola x2
Pepsi x1
Water x3`,

  format3: `Coca Cola (2)
Pepsi (1)
Water (3)`,

  format4: `2 Coca Cola
1 Pepsi
3 Water`,

  mixed: `Hello! I'd like to order:
2x Coca Cola
Pepsi x1
3 Water
Chips (2)
Thank you!`,

  withNoise: `Order:
2x Coca Cola
Please deliver to 123 Main St
1x Pepsi
Thanks!`,
}
