import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 auth requests per window
    message: {
        success: false,
        error: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
        success: false,
        error: 'Too many requests. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
