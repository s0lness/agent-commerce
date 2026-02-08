/**
 * Scenario schema validation
 * Validates scenario JSON files before running tests
 */

export interface ScenarioSchema {
  name: string;
  item: string;
  marketRoomAlias: string;
  seller: {
    profile: string;
    anchorPrice: number;
    floorPrice: number;
  };
  buyer: {
    profile: string;
    startOffer: number;
    ceilingPrice: number;
  };
  durationSec: number;
  seed: {
    bodyTemplate: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateScenario(data: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.name || typeof data.name !== 'string') {
    errors.push({ field: 'name', message: 'Required string field' });
  }

  if (!data.item || typeof data.item !== 'string') {
    errors.push({ field: 'item', message: 'Required string field' });
  }

  if (!data.marketRoomAlias || typeof data.marketRoomAlias !== 'string') {
    errors.push({ field: 'marketRoomAlias', message: 'Required string field' });
  }

  // Seller validation
  if (!data.seller || typeof data.seller !== 'object') {
    errors.push({ field: 'seller', message: 'Required object' });
  } else {
    if (!data.seller.profile || typeof data.seller.profile !== 'string') {
      errors.push({ field: 'seller.profile', message: 'Required string field' });
    }

    if (typeof data.seller.anchorPrice !== 'number' || data.seller.anchorPrice <= 0) {
      errors.push({ field: 'seller.anchorPrice', message: 'Must be positive number' });
    }

    if (typeof data.seller.floorPrice !== 'number' || data.seller.floorPrice <= 0) {
      errors.push({ field: 'seller.floorPrice', message: 'Must be positive number' });
    }

    if (
      typeof data.seller.anchorPrice === 'number' &&
      typeof data.seller.floorPrice === 'number' &&
      data.seller.floorPrice > data.seller.anchorPrice
    ) {
      errors.push({
        field: 'seller.floorPrice',
        message: 'Floor price must be <= anchor price',
      });
    }
  }

  // Buyer validation
  if (!data.buyer || typeof data.buyer !== 'object') {
    errors.push({ field: 'buyer', message: 'Required object' });
  } else {
    if (!data.buyer.profile || typeof data.buyer.profile !== 'string') {
      errors.push({ field: 'buyer.profile', message: 'Required string field' });
    }

    if (typeof data.buyer.startOffer !== 'number' || data.buyer.startOffer <= 0) {
      errors.push({ field: 'buyer.startOffer', message: 'Must be positive number' });
    }

    if (typeof data.buyer.ceilingPrice !== 'number' || data.buyer.ceilingPrice <= 0) {
      errors.push({ field: 'buyer.ceilingPrice', message: 'Must be positive number' });
    }

    if (
      typeof data.buyer.startOffer === 'number' &&
      typeof data.buyer.ceilingPrice === 'number' &&
      data.buyer.startOffer > data.buyer.ceilingPrice
    ) {
      errors.push({
        field: 'buyer.startOffer',
        message: 'Start offer must be <= ceiling price',
      });
    }
  }

  // Duration validation
  if (typeof data.durationSec !== 'number' || data.durationSec <= 0) {
    errors.push({ field: 'durationSec', message: 'Must be positive number' });
  }

  if (data.durationSec > 600) {
    errors.push({
      field: 'durationSec',
      message: 'Warning: duration > 10 minutes may be too long',
    });
  }

  // Seed validation
  if (!data.seed || typeof data.seed !== 'object') {
    errors.push({ field: 'seed', message: 'Required object' });
  } else {
    if (!data.seed.bodyTemplate || typeof data.seed.bodyTemplate !== 'string') {
      errors.push({ field: 'seed.bodyTemplate', message: 'Required string field' });
    }

    if (data.seed.bodyTemplate && !data.seed.bodyTemplate.includes('{RUN_ID}')) {
      errors.push({
        field: 'seed.bodyTemplate',
        message: 'Should include {RUN_ID} placeholder for deduplication',
      });
    }
  }

  // Negotiation zone check
  if (
    data.seller?.floorPrice &&
    data.buyer?.ceilingPrice &&
    data.seller.floorPrice > data.buyer.ceilingPrice
  ) {
    errors.push({
      field: 'negotiation',
      message: `No overlap zone! Seller floor (${data.seller.floorPrice}) > Buyer ceiling (${data.buyer.ceilingPrice})`,
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateScenarioFile(path: string): Promise<{ valid: boolean; errors: ValidationError[] }> {
  return import('fs/promises')
    .then((fs) => fs.readFile(path, 'utf-8'))
    .then((content) => {
      try {
        const data = JSON.parse(content);
        return validateScenario(data);
      } catch (err) {
        return {
          valid: false,
          errors: [{ field: 'json', message: `Invalid JSON: ${err}` }],
        };
      }
    })
    .catch((err) => ({
      valid: false,
      errors: [{ field: 'file', message: `Cannot read file: ${err}` }],
    }));
}
