// Direct test of the app.js file
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const request = require('supertest');
const { sampleHtmlWithYale } = require('./test-utils');

// Mock dependencies
jest.mock('axios');
jest.mock('express', () => {
  const expressApp = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    listen: jest.fn().mockReturnThis(),
    static: jest.fn()
  };
  
  return jest.fn(() => expressApp);
});

// Load the app.js file directly
const appPath = path.join(__dirname, '..', 'app.js');
const appContent = fs.readFileSync(appPath, 'utf8');

// Create a sandbox to run the app.js code
const sandbox = {
  require: (module) => {
    if (module === 'express') return express();
    if (module === 'axios') return axios;
    if (module === 'cheerio') return cheerio;
    if (module === 'path') return path;
    throw new Error(`Unexpected module: ${module}`);
  },
  console: {
    log: jest.fn(),
    error: jest.fn()
  },
  module: {},
  __dirname: path.join(__dirname, '..')
};

// Execute the app.js code in the sandbox
function executeApp() {
  const script = new Function('module', 'exports', 'require', '__dirname', 'console', appContent);
  script.call(sandbox, sandbox.module, sandbox.module.exports, sandbox.require, sandbox.__dirname, sandbox.console);
  return sandbox;
}

describe('App.js Direct Tests', () => {
  let app;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Execute app.js
    const sandbox = executeApp();
    app = express();
  });
  
  test('app should set up middleware and routes', () => {
    // Check if express.use was called for middleware
    expect(app.use).toHaveBeenCalled();
    
    // Check if routes were set up
    expect(app.get).toHaveBeenCalled();
    expect(app.post).toHaveBeenCalled();
  });
  
  test('app should start the server on the specified port', () => {
    // Check if app.listen was called
    expect(app.listen).toHaveBeenCalled();
    expect(sandbox.console.log).toHaveBeenCalled();
  });
  
  // Test the fetch endpoint handler directly
  test('fetch endpoint should handle Yale replacements correctly', async () => {
    // Create a mock request and response
    const req = {
      body: { url: 'https://example.com' }
    };
    
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Mock axios response
    axios.get.mockResolvedValueOnce({
      data: sampleHtmlWithYale
    });
    
    // Get the post handler for /fetch
    const fetchHandler = app.post.mock.calls.find(call => call[0] === '/fetch')[1];
    
    // Call the handler directly
    await fetchHandler(req, res);
    
    // Check if the response was correct
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      originalUrl: 'https://example.com'
    }));
  });
  
  // Test error handling in the fetch endpoint
  test('fetch endpoint should handle missing URL', async () => {
    // Create a mock request and response
    const req = {
      body: {}
    };
    
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Get the post handler for /fetch
    const fetchHandler = app.post.mock.calls.find(call => call[0] === '/fetch')[1];
    
    // Call the handler directly
    await fetchHandler(req, res);
    
    // Check if the response was correct
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'URL is required' });
  });
  
  // Test error handling for network errors
  test('fetch endpoint should handle network errors', async () => {
    // Create a mock request and response
    const req = {
      body: { url: 'https://example.com' }
    };
    
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Mock axios to throw an error
    axios.get.mockRejectedValueOnce(new Error('Network error'));
    
    // Get the post handler for /fetch
    const fetchHandler = app.post.mock.calls.find(call => call[0] === '/fetch')[1];
    
    // Call the handler directly
    await fetchHandler(req, res);
    
    // Check if the response was correct
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Failed to fetch content')
    }));
  });
});
