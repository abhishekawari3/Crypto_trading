const { z } = require('zod');

const addSymbolSchema = z.object({
  symbol: z
    .string()
    .min(3, 'Symbol must be at least 3 characters')
    .max(20, 'Symbol is too long')
    .transform((val) => val.toUpperCase()),
});

const leaderboardQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
});

module.exports = {
  addSymbolSchema,
  leaderboardQuerySchema,
};
