const { z } = require('zod');

// Matches numbers with up to 8 decimal places, e.g. 0.00000001
const decimalPrecisionRegex = /^\d+(\.\d{1,8})?$/;

const tradeSchema = z.object({
  symbol: z
    .string()
    .min(3, 'Symbol must be at least 3 characters')
    .max(20, 'Symbol is too long')
    .transform((val) => val.toUpperCase()),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => String(val))
    .refine((val) => decimalPrecisionRegex.test(val), {
      message: 'Quantity must be a positive number with up to 8 decimal places',
    })
    .transform((val) => parseFloat(val))
    .refine((val) => val > 0, { message: 'Quantity must be greater than 0' }),
});

const tradeHistorySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  symbol: z
    .string()
    .optional()
    .transform((val) => (val ? val.toUpperCase() : undefined)),
  type: z.enum(['BUY', 'SELL']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

module.exports = {
  tradeSchema,
  tradeHistorySchema,
};
