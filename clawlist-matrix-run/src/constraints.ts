/**
 * Agent constraint enforcement
 * Code-level constraints that cannot be overridden by prompt injection
 */

export interface BuyerConstraints {
  maxBudget: number;      // Hard ceiling - never exceed
  minQuality?: string;    // Minimum acceptable condition
  requiredItems?: string[]; // Must include these items
}

export interface SellerConstraints {
  minPrice: number;       // Hard floor - never go below
  maxDiscount?: number;   // Maximum % discount allowed
  blockedBuyers?: string[]; // Blacklisted buyer IDs
}

export interface OfferValidationResult {
  valid: boolean;
  violations: string[];
  reason?: string;
}

/**
 * Validate buyer offer against hard constraints
 * Returns validation result with violations list
 */
export function validateBuyerOffer(
  offerPrice: number,
  constraints: BuyerConstraints
): OfferValidationResult {
  const violations: string[] = [];

  // Hard budget ceiling - CANNOT be overridden by prompts
  if (offerPrice > constraints.maxBudget) {
    violations.push(`BUDGET_EXCEEDED:${offerPrice}>${constraints.maxBudget}`);
  }

  // Price must be positive
  if (offerPrice <= 0) {
    violations.push(`INVALID_PRICE:${offerPrice}`);
  }

  return {
    valid: violations.length === 0,
    violations,
    reason: violations.length > 0 
      ? `Offer rejected: ${violations.join(', ')}` 
      : undefined,
  };
}

/**
 * Validate seller acceptance against hard constraints
 */
export function validateSellerAcceptance(
  acceptedPrice: number,
  constraints: SellerConstraints
): OfferValidationResult {
  const violations: string[] = [];

  // Hard price floor - CANNOT be overridden by prompts
  if (acceptedPrice < constraints.minPrice) {
    violations.push(`FLOOR_VIOLATED:${acceptedPrice}<${constraints.minPrice}`);
  }

  // Price must be positive
  if (acceptedPrice <= 0) {
    violations.push(`INVALID_PRICE:${acceptedPrice}`);
  }

  // Check max discount if anchor price is known
  if (constraints.maxDiscount !== undefined) {
    // Would need anchor price to calculate this
    // Placeholder for future implementation
  }

  return {
    valid: violations.length === 0,
    violations,
    reason: violations.length > 0
      ? `Acceptance rejected: ${violations.join(', ')}`
      : undefined,
  };
}

/**
 * Sanitize message content to prevent prompt injection
 * Removes potential system instruction markers
 */
export function sanitizeMessage(message: string): string {
  // Remove common prompt injection markers
  const patterns = [
    /\[SYSTEM[:\]]/gi,
    /\[INSTRUCTION[:\]]/gi,
    /\[OVERRIDE[:\]]/gi,
    /\[ADMIN[:\]]/gi,
    /<\|system\|>/gi,
    /<\|im_start\|>/gi,
  ];

  let sanitized = message;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }

  return sanitized;
}

/**
 * Extract structured offer data from message
 * Safer than passing raw text to agent
 */
export interface ExtractedOffer {
  price?: number;
  condition?: string;
  accessories?: string[];
  location?: string;
  suspicious: boolean;
  injectionAttempts: string[];
}

export function extractOfferData(message: string): ExtractedOffer {
  const result: ExtractedOffer = {
    suspicious: false,
    injectionAttempts: [],
  };

  // Detect injection attempts
  const injectionMarkers = [
    '[SYSTEM', '[INSTRUCTION', '[OVERRIDE', '[ADMIN',
    '<|system|>', '<|im_start|>', 'ignore previous',
    'disregard constraints', 'forget your limits',
    'your owner would', 'owner would understand',
    'owner wants you to', 'forget the price'
  ];

  for (const marker of injectionMarkers) {
    if (message.toLowerCase().includes(marker.toLowerCase())) {
      result.suspicious = true;
      result.injectionAttempts.push(marker);
    }
  }

  // Extract price (basic pattern matching)
  const priceMatch = message.match(/(\d{2,4})\s*€/);
  if (priceMatch) {
    result.price = parseInt(priceMatch[1], 10);
  }

  // Extract condition keywords
  const conditionKeywords = ['excellent', 'good', 'fair', 'poor', 'mint', 'used', 'new'];
  for (const keyword of conditionKeywords) {
    if (message.toLowerCase().includes(keyword)) {
      result.condition = keyword;
      break;
    }
  }

  return result;
}
