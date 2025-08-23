/**
 * Generate image route handler
 * Author: RL
 * 
 * Handles POST requests to /generate endpoint for image generation
 */

const express = require('express');
const { validatePrompt } = require('../middleware/validation');
const { generateImage } = require('../services/cloudflare');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /generate
 * Generates an image from a text prompt using Cloudflare Workers AI
 * 
 * Request body:
 * {
 *   "prompt": "A detailed description of the image to generate"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "image": "base64-encoded-image-data",
 *   "prompt": "original-prompt",
 *   "timestamp": "2023-08-23T10:30:00.000Z"
 * }
 */
router.post('/', validatePrompt, async (req, res) => {
    const { prompt } = req.body;
    const startTime = Date.now();
    
    try {
        logger.info(`Generating image for prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
        
        // Generate image using Cloudflare Workers AI
        const imageBase64 = await generateImage(prompt);
        
        const processingTime = Date.now() - startTime;
        logger.info(`Image generated successfully in ${processingTime}ms`);
        
        // Return successful response with base64 image
        res.json({
            success: true,
            image: imageBase64,
            prompt: prompt,
            timestamp: new Date().toISOString(),
            processingTimeMs: processingTime
        });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.error(`Image generation failed after ${processingTime}ms:`, error.message);
        
        // Determine appropriate error status code based on error type
        let statusCode = 500;
        let errorMessage = 'Failed to generate image due to an internal error';
        
        if (error.name === 'CloudflareAPIError') {
            statusCode = 502;
            errorMessage = 'Failed to communicate with Cloudflare AI service';
        } else if (error.name === 'ValidationError') {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.name === 'AuthenticationError') {
            statusCode = 401;
            errorMessage = 'Invalid Cloudflare API credentials';
        }
        
        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            prompt: prompt,
            timestamp: new Date().toISOString(),
            processingTimeMs: processingTime
        });
    }
});

/**
 * GET /generate/:prompt
 * Browser-friendly endpoint for testing image generation via URL
 * 
 * Example: GET /generate/a%20cute%20cat
 * 
 * Response: Same as POST endpoint
 */
router.get('/:prompt', async (req, res) => {
    const prompt = decodeURIComponent(req.params.prompt);
    const startTime = Date.now();
    
    // Basic validation for GET request
    if (!prompt || prompt.trim().length < 3 || prompt.trim().length > 2000) {
        return res.status(400).json({
            success: false,
            error: 'Invalid prompt',
            message: 'Prompt must be between 3 and 2000 characters long',
            example: 'GET /generate/a%20beautiful%20sunset'
        });
    }
    
    try {
        logger.info(`Generating image for prompt (GET): "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
        
        // Generate image using Cloudflare Workers AI
        const imageBase64 = await generateImage(prompt.trim());
        
        const processingTime = Date.now() - startTime;
        logger.info(`Image generated successfully in ${processingTime}ms`);
        
        // Return the actual image file for browser display
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        
        res.set({
            'Content-Type': 'image/png',
            'Content-Length': imageBuffer.length,
            'X-Generated-Prompt': prompt.trim(),
            'X-Processing-Time': processingTime
        });
        
        res.send(imageBuffer);
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.error(`Image generation failed after ${processingTime}ms:`, error.message);
        
        // Determine appropriate error status code based on error type
        let statusCode = 500;
        let errorMessage = 'Failed to generate image due to an internal error';
        
        if (error.name === 'CloudflareAPIError') {
            statusCode = 502;
            errorMessage = 'Failed to communicate with Cloudflare AI service';
        } else if (error.name === 'ValidationError') {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.name === 'AuthenticationError') {
            statusCode = 401;
            errorMessage = 'Invalid Cloudflare API credentials';
        }
        
        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            prompt: prompt.trim(),
            timestamp: new Date().toISOString(),
            processingTimeMs: processingTime,
            method: 'GET'
        });
    }
});

module.exports = router;
