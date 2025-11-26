/**
 * Company/Prospect Criteria Evaluation
 * Evaluates leads against company-level criteria (revenue, employees, industry, etc.)
 */

export interface CompanyCriteria {
  revenue?: {
    min?: number // Minimum annual revenue (NOK)
    max?: number // Maximum annual revenue (NOK)
    equals?: number // Exact revenue
  }
  employees?: {
    min?: number // Minimum number of employees
    max?: number // Maximum number of employees
    equals?: number // Exact number
  }
  industry?: string | string[] // Industry type(s) - can be array for multiple
  // Add more criteria types as needed
  [key: string]: any // Allow custom criteria
}

export interface CompanyCriteriaMatch {
  matched_criteria: Record<string, boolean>
  score: number // 0-100
  all_met: boolean
}

/**
 * Evaluate lead against company criteria
 */
export function evaluateCompanyCriteria(
  criteria: CompanyCriteria,
  leadData: {
    revenue?: number
    employees?: number
    industry?: string
  }
): CompanyCriteriaMatch {
  const matchedCriteria: Record<string, boolean> = {}
  let totalCriteria = 0
  let matchedCount = 0

  // Check revenue criteria
  if (criteria.revenue && leadData.revenue !== undefined) {
    totalCriteria++
    let matched = false

    if (criteria.revenue.min !== undefined) {
      matched = leadData.revenue >= criteria.revenue.min
    }
    if (criteria.revenue.max !== undefined && matched) {
      matched = leadData.revenue <= criteria.revenue.max
    }
    if (criteria.revenue.equals !== undefined) {
      matched = leadData.revenue === criteria.revenue.equals
    }

    matchedCriteria.revenue = matched
    if (matched) matchedCount++
  }

  // Check employees criteria
  if (criteria.employees && leadData.employees !== undefined) {
    totalCriteria++
    let matched = false

    if (criteria.employees.min !== undefined) {
      matched = leadData.employees >= criteria.employees.min
    }
    if (criteria.employees.max !== undefined && matched) {
      matched = leadData.employees <= criteria.employees.max
    }
    if (criteria.employees.equals !== undefined) {
      matched = leadData.employees === criteria.employees.equals
    }

    matchedCriteria.employees = matched
    if (matched) matchedCount++
  }

  // Check industry criteria
  if (criteria.industry && leadData.industry) {
    totalCriteria++
    let matched = false

    if (Array.isArray(criteria.industry)) {
      matched = criteria.industry.some(
        ind => leadData.industry?.toLowerCase().includes(ind.toLowerCase())
      )
    } else {
      matched = leadData.industry.toLowerCase().includes(criteria.industry.toLowerCase())
    }

    matchedCriteria.industry = matched
    if (matched) matchedCount++
  }

  // Calculate score
  const score = totalCriteria > 0 ? (matchedCount / totalCriteria) * 100 : 0

  return {
    matched_criteria: matchedCriteria,
    score: Math.round(score),
    all_met: matchedCount === totalCriteria && totalCriteria > 0,
  }
}

/**
 * Parse company criteria from campaign
 * Supports both structured format and simple string format
 */
export function parseCompanyCriteria(criteria: any): CompanyCriteria | null {
  if (!criteria) return null

  // If it's already an object, return it
  if (typeof criteria === 'object' && !Array.isArray(criteria)) {
    return criteria as CompanyCriteria
  }

  // If it's a string, try to parse it
  if (typeof criteria === 'string') {
    try {
      const parsed = JSON.parse(criteria)
      return parsed as CompanyCriteria
    } catch {
      return null
    }
  }

  return null
}

/**
 * Format company criteria for display
 */
export function formatCompanyCriteria(criteria: CompanyCriteria): string[] {
  const formatted: string[] = []

  if (criteria.revenue) {
    if (criteria.revenue.min) {
      formatted.push(`Revenue: ${criteria.revenue.min.toLocaleString()} NOK+`)
    }
    if (criteria.revenue.max) {
      formatted.push(`Revenue: Up to ${criteria.revenue.max.toLocaleString()} NOK`)
    }
    if (criteria.revenue.equals) {
      formatted.push(`Revenue: ${criteria.revenue.equals.toLocaleString()} NOK`)
    }
  }

  if (criteria.employees) {
    if (criteria.employees.min) {
      formatted.push(`Employees: ${criteria.employees.min}+`)
    }
    if (criteria.employees.max) {
      formatted.push(`Employees: Up to ${criteria.employees.max}`)
    }
    if (criteria.employees.equals) {
      formatted.push(`Employees: ${criteria.employees.equals}`)
    }
  }

  if (criteria.industry) {
    const industries = Array.isArray(criteria.industry) 
      ? criteria.industry.join(', ') 
      : criteria.industry
    formatted.push(`Industry: ${industries}`)
  }

  return formatted
}

/**
 * Example company criteria structure:
 * {
 *   "revenue": { "min": 10000000 }, // 10M NOK+
 *   "employees": { "min": 100 },
 *   "industry": ["hospitality", "hotel", "restaurant"]
 * }
 */

