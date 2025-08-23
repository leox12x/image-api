# AI Image Generation API

## Overview

This is a Node.js Express REST API that serves as a proxy for Cloudflare Workers AI Stable Diffusion image generation. The application provides a simple HTTP interface for generating images from text prompts using Cloudflare's AI infrastructure. It features request validation, comprehensive error handling, and structured logging to ensure reliable operation.

**Credits: Strictly made by Rahman Leon / RL**

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Express.js server with modular route structure
- **Design Pattern**: Service-oriented architecture with clear separation of concerns
- **Middleware Stack**: CORS enabled, JSON body parsing with 10MB limit for base64 image responses, and custom request validation
- **Error Handling**: Custom error classes for different failure scenarios (API errors, authentication errors)

### API Design
- **RESTful Endpoints**: 
  - `POST /generate` - Main image generation endpoint
  - `GET /health` - Service health monitoring
- **Request Validation**: Comprehensive prompt validation including type checking, length limits (3-2000 characters), and content validation
- **Response Format**: Standardized JSON responses with success flags, base64-encoded images, and metadata

### Service Layer
- **Cloudflare Integration**: Dedicated service module for interacting with Cloudflare Workers AI Stable Diffusion XL model
- **Authentication**: Token-based authentication using Cloudflare API tokens and account IDs
- **Error Classification**: Structured error handling with specific error types for different failure modes

### Logging System
- **Custom Logger**: Built-in logging utility with configurable log levels (ERROR, WARN, INFO, DEBUG)
- **Request Tracking**: Automatic logging of all incoming requests with IP addresses and processing times
- **Performance Monitoring**: Request duration tracking for image generation operations

### Configuration Management
- **Environment Variables**: Centralized configuration using dotenv for API credentials and service settings
- **Security**: Sensitive credentials (API tokens, account IDs) managed through environment variables

## External Dependencies

### AI Services
- **Cloudflare Workers AI**: Primary image generation service using Stable Diffusion XL Base 1.0 model
- **Authentication**: Requires Cloudflare API token and account ID for service access

### Core Dependencies
- **Express.js**: Web framework for API server
- **CORS**: Cross-origin resource sharing middleware
- **dotenv**: Environment variable management

### Infrastructure Requirements
- **Node.js Runtime**: Server execution environment
- **Network Access**: Outbound HTTPS connections to Cloudflare API endpoints
- **Memory**: Sufficient RAM for handling base64-encoded image responses (10MB+ payloads)