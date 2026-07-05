const { z } = require('zod');

const registerSchema = z.object({
    email: z
    .string()
    .email('Invalid email address'),

    password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be at most 128 characters long'),
});

const loginSchema = z.object({
    email: z
    .string()
    .email('Invalid email address'),

    password: z
    .string()
    .min(1, 'Password required'),
});

const refreshSchema = z.object({
    refreshToken: z
    .string()
    .min(1, 'Refresh token required'),
});

const logoutSchema = z.object({
    refreshToken: z
    .string()
    .min(1, 'Refresh token required'),
})

module.exports = {
    registerSchema,
    loginSchema,
    refreshSchema,
    logoutSchema,
}