/**
 * Cloudflare Workers AI Service
 * Author: RL
 * 
 * Service module for interacting with Cloudflare Workers AI Stable Diffusion endpoint
 */

const logger = require('../utils/logger');

// Cloudflare Workers AI configuration
const CLOUDFLARE_BASE_URL = 'https://api.cloudflare.com/client/v4';
const STABLE_DIFFUSION_MODEL = '@cf/stabilityai/stable-diffusion-xl-base-1.0';

/**
 * Custom error class for Cloudflare API errors
 */
class CloudflareAPIError extends Error {
    constructor(message, status, response) {
        super(message);
        this.name = 'CloudflareAPIError';
        this.status = status;
        this.response = response;
    }
}

/**
 * Custom error class for authentication errors
 */
class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

/**
 * Validates Cloudflare API credentials
 * @returns {Object} Object containing accountId and apiToken
 * @throws {AuthenticationError} If credentials are missing
 */
function validateCredentials() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    
    if (!accountId) {
        throw new AuthenticationError('CLOUDFLARE_ACCOUNT_ID environment variable is required');
    }
    
    if (!apiToken) {
        throw new AuthenticationError('CLOUDFLARE_API_TOKEN environment variable is required');
    }
    
    return { accountId, apiToken };
}

/**
 * Builds the Cloudflare Workers AI endpoint URL
 * @param {string} accountId - Cloudflare account ID
 * @returns {string} Complete endpoint URL
 */
function buildEndpointUrl(accountId) {
    return `${CLOUDFLARE_BASE_URL}/accounts/${accountId}/ai/run/${STABLE_DIFFUSION_MODEL}`;
}

/**
 * Creates request headers for Cloudflare API
 * @param {string} apiToken - Cloudflare API token
 * @returns {Object} Headers object
 */
function createRequestHeaders(apiToken) {
    return {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'NodeJS-Image-Generator/1.0'
    };
}

/**
 * Processes the response from Cloudflare Workers AI
 * @param {Response} response - Fetch response object
 * @returns {Promise<string>} Base64 encoded image data
 * @throws {CloudflareAPIError} If API request fails
 */
async function processCloudflareResponse(response) {
    if (!response.ok) {
        let errorMessage = `Cloudflare API request failed with status ${response.status}`;
        
        try {
            const errorData = await response.json();
            if (errorData.errors && errorData.errors.length > 0) {
                errorMessage = errorData.errors[0].message || errorMessage;
            }
        } catch (parseError) {
            logger.warn('Failed to parse error response from Cloudflare API');
        }
        
        throw new CloudflareAPIError(errorMessage, response.status, response);
    }
    
    // Get the response as array buffer (binary data)
    const arrayBuffer = await response.arrayBuffer();
    
    // Convert array buffer to base64 string
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    
    logger.info(`Received image data: ${Math.round(buffer.length / 1024)}KB`);
    
    return base64Image;
}

/**
 * Generates an image using Cloudflare Workers AI Stable Diffusion
 * @param {string} prompt - Text prompt for image generation
 * @returns {Promise<string>} Base64 encoded image data
 * @throws {AuthenticationError} If API credentials are invalid
 * @throws {CloudflareAPIError} If API request fails
 * @throws {Error} For other unexpected errors
 */
async function generateImage(prompt) {
    try {
        // Validate credentials
        const { accountId, apiToken } = validateCredentials();
        
        // Build request URL and headers
        const url = buildEndpointUrl(accountId);
        const headers = createRequestHeaders(apiToken);
        
        // Prepare request payload
        const requestBody = {
            prompt: prompt.trim(),
            // Optional parameters for Stable Diffusion XL
            num_steps: 20,
            guidance_scale: 7.5,
            seed: Math.floor(Math.random() * 1000000) // Random seed for variety
        };
        
        logger.info(`Making request to Cloudflare Workers AI: ${url}`);
        logger.debug(`Request payload:`, requestBody);
        
        // Make API request to Cloudflare Workers AI
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        // Process response and return base64 image data
        return await processCloudflareResponse(response);
        
    } catch (error) {
        // Re-throw known error types
        if (error instanceof AuthenticationError || error instanceof CloudflareAPIError) {
            throw error;
        }
        
        // Handle network or other unexpected errors
        logger.error('Unexpected error in generateImage:', error);
        throw new Error(`Image generation failed: ${error.message}`);
    }
}

/**
 * Validates if a prompt is suitable for image generation
 * @param {string} prompt - Text prompt to validate
 * @returns {boolean} True if prompt is valid
 */
function isValidPrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
        return false;
    }
    
    const trimmedPrompt = prompt.trim();
    
    // Check minimum and maximum length
    if (trimmedPrompt.length < 3 || trimmedPrompt.length > 2000) {
        return false;
    }
    
    // Check for potentially harmful content (basic filtering)
    const prohibitedTerms = ['nsfw', 'explicit', 'gore', 'violence'];
    const lowerPrompt = trimmedPrompt.toLowerCase();
    
    return !prohibitedTerms.some(term => lowerPrompt.includes(term));
}

module.exports = {
    generateImage,
    isValidPrompt,
    CloudflareAPIError,
    AuthenticationError
};
