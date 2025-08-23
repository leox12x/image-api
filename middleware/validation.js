/**
 * Request validation middleware
 * Author: RL
 * 
 * Middleware for validating incoming requests to the generate endpoint
 */

const { isValidPrompt } = require('../services/cloudflare');
const logger = require('../utils/logger');

/**
 * Validates the prompt field in request body
 * Ensures prompt exists, is a string, and meets content requirements
 */
function validatePrompt(req, res, next) {
    const { prompt } = req.body;
    
    // Check if prompt exists
    if (!prompt) {
        logger.warn('Request missing prompt field');
        return res.status(400).json({
            success: false,
            error: 'Missing required field: prompt',
            message: 'Request body must include a "prompt" field with the text description for image generation.',
            example: {
                prompt: "A beautiful landscape with mountains and a lake at sunset"
            }
        });
    }
    
    // Check if prompt is a string
    if (typeof prompt !== 'string') {
        logger.warn(`Invalid prompt type: ${typeof prompt}`);
        return res.status(400).json({
            success: false,
            error: 'Invalid prompt type',
            message: 'The "prompt" field must be a string.',
            received: typeof prompt
        });
    }
    
    // Validate prompt content and length
    if (!isValidPrompt(prompt)) {
        const trimmedPrompt = prompt.trim();
        let errorMessage = 'Invalid prompt';
        
        if (trimmedPrompt.length < 3) {
            errorMessage = 'Prompt must be at least 3 characters long';
        } else if (trimmedPrompt.length > 2000) {
            errorMessage = 'Prompt must not exceed 2000 characters';
        } else {
            errorMessage = 'Prompt contains prohibited content or invalid characters';
        }
        
        logger.warn(`Prompt validation failed: ${errorMessage}`);
        return res.status(400).json({
            success: false,
            error: 'Invalid prompt',
            message: errorMessage,
            promptLength: trimmedPrompt.length,
            maxLength: 2000,
            minLength: 3
        });
    }
    
    // Normalize prompt by trimming whitespace
    req.body.prompt = prompt.trim();
    
    logger.debug('Prompt validation passed');
    next();
}

/**
 * Validates Content-Type header for JSON requests
 */
function validateContentType(req, res, next) {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
        logger.warn(`Invalid Content-Type: ${contentType}`);
        return res.status(400).json({
            success: false,
            error: 'Invalid Content-Type',
            message: 'Request must have Content-Type: application/json',
            received: contentType || 'none'
        });
    }
    
    next();
}

/**
 * Rate limiting validation (basic implementation)
 * In production, consider using express-rate-limit or similar
 */
function validateRequestRate(req, res, next) {
    // Basic rate limiting based on IP
    const clientIP = req.ip;
    const now = Date.now();
    
    // Initialize rate limiting store (in-memory, use Redis in production)
    if (!global.rateLimitStore) {
        global.rateLimitStore = new Map();
    }
    
    const rateLimit = {
        windowMs: 60 * 1000, // 1 minute window
        maxRequests: 10 // Max 10 requests per minute per IP
    };
    
    const clientRequests = global.rateLimitStore.get(clientIP) || [];
    
    // Remove requests outside the current window
    const validRequests = clientRequests.filter(timestamp => 
        now - timestamp < rateLimit.windowMs
    );
    
    if (validRequests.length >= rateLimit.maxRequests) {
        logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
        return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            message: `Too many requests. Maximum ${rateLimit.maxRequests} requests per minute allowed.`,
            retryAfter: Math.ceil((validRequests[0] + rateLimit.windowMs - now) / 1000)
        });
    }
    
    // Add current request timestamp
    validRequests.push(now);
    global.rateLimitStore.set(clientIP, validRequests);
    
    next();
}

module.exports = {
    validatePrompt,
    validateContentType,
    validateRequestRate
};
