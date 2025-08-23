/**
 * Node.js Express REST API for Cloudflare Workers AI Stable Diffusion
 * Author: RL
 * 
 * Main server file that sets up Express application and middleware
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const generateRoutes = require('./routes/generate');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 image responses
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Routes
app.use('/generate', generateRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        Author: 'RL'
    });
});

// Keep-alive ping endpoint for free hosting services
app.get('/ping', (req, res) => {
    res.json({ 
        ping: 'pong', 
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Auto-ping function to keep service awake on free hosting
function keepAlive() {
    const url = process.env.RENDER_EXTERNAL_URL || process.env.VERCEL_URL;
    if (url) {
        setInterval(() => {
            fetch(`${url}/ping`)
                .then(() => logger.info('Keep-alive ping sent'))
                .catch(err => logger.warn('Keep-alive ping failed:', err.message));
        }, 14 * 60 * 1000); // Ping every 14 minutes
    }
}

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The requested endpoint ${req.originalUrl} does not exist.`,
        availableEndpoints: [
            'POST /generate',
            'GET /health'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request.',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, HOST, () => {
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info('Available endpoints:');
    logger.info('  POST /generate - Generate image from text prompt');
    logger.info('  GET /health - Health check');
    logger.info('  GET /ping - Keep-alive endpoint');
    
    // Validate required environment variables
    const requiredEnvVars = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
        logger.warn(`Missing environment variables: ${missingEnvVars.join(', ')}`);
        logger.warn('Please ensure these are set for the API to function properly');
    }
    
    // Start keep-alive function for free hosting
    keepAlive();
    logger.info('Keep-alive system activated for 24/7 uptime on free hosting');
});

module.exports = app;
