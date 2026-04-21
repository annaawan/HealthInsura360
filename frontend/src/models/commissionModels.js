// src/models/commissionModels.js

export const CommissionStructure = {
  // Tiered commission rates based on sales volume
  TIERS: [
    { min: 0, max: 10000, rate: 5 },
    { min: 10001, max: 25000, rate: 8 },
    { min: 25001, max: 50000, rate: 12 },
    { min: 50001, max: 100000, rate: 15 },
    { min: 100001, max: Infinity, rate: 18 }
  ],
  
  // Product-specific commission rates
  PRODUCT_RATES: {
    'Individual Health': 10,
    'Family Plan': 12,
    'Medicare Supplement': 15,
    'Dental/Vision': 8,
    'Short-term Medical': 6
  }
};

export const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  PROCESSING: 'processing',
  FAILED: 'failed'
};