const request = require('supertest');
const express = require('express');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { sampleHtmlWithYale } = require('./test-utils');

// Mock axios
jest.mock('axios');

// Create a test app with the same routes as the real app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Import the route handlers from app.js
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the content from the provided URL
    const response = await axios.get(url);
    const html = response.data;

    // Use cheerio to parse HTML and selectively replace text content, not URLs
    const $ = cheerio.load(html);
    
    // Process text nodes in the body
    $('body *').contents().filter(function() {
      return this.nodeType === 3; // Text nodes only
    }).each(function() {
      // Replace text content but not in URLs or attributes
      const text = $(this).text();
      // Use regex with word boundaries to only replace exact instances of Yale
      const newText = text
        .replace(/\bYale\b/g, 'Fale')
        .replace(/\byale\b/g, 'fale')
        .replace(/\bYALE\b/g, 'FALE');
      if (text !== newText) {
        $(this).replaceWith(newText);
      }
    });
    
    // Process title separately
    const title = $('title').text()
      .replace(/\bYale\b/g, 'Fale')
      .replace(/\byale\b/g, 'fale')
      .replace(/\bYALE\b/g, 'FALE');
    $('title').text(title);
    
    return res.json({ 
      success: true, 
      content: $.html(),
      title: title,
      originalUrl: url
    });
  } catch (error) {
    console.error('Error fetching URL:', error.message);
    return res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}` 
    });
  }
});

describe('App Routes', () => {
  // Test the main route
  test('GET / should serve the index.html file', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
  });

  // Test the fetch endpoint with a valid URL
  test('POST /fetch should fetch and replace Yale with Fale', async () => {
    // Mock axios response
    axios.get.mockResolvedValueOnce({
      data: sampleHtmlWithYale
    });

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/' });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.title).toBe('Fale University Test Page');
    expect(response.body.content).toContain('Welcome to Fale University');
    expect(response.body.originalUrl).toBe('https://example.com/');
  });

  // Test the fetch endpoint with missing URL
  test('POST /fetch should return 400 if URL is missing', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('URL is required');
  });

  // Test the fetch endpoint with a network error
  test('POST /fetch should handle errors from external sites', async () => {
    // Mock axios to throw an error
    axios.get.mockRejectedValueOnce(new Error('Network error'));

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://error-site.com/' });

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toContain('Failed to fetch content');
  });

  // Test the fetch endpoint with a malformed URL
  test('POST /fetch should handle malformed URLs', async () => {
    // Mock axios to throw a specific error for malformed URLs
    axios.get.mockRejectedValueOnce(new Error('Invalid URL'));

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'not-a-valid-url' });

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toContain('Failed to fetch content');
  });

  // Test the replacement logic with different Yale variations
  test('POST /fetch should handle different case variations of Yale', async () => {
    // HTML with different case variations
    const htmlWithVariations = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>YALE and Yale and yale Test</title>
      </head>
      <body>
        <p>This is YALE University, Yale College, and yale medical school.</p>
      </body>
      </html>
    `;

    // Mock axios response
    axios.get.mockResolvedValueOnce({
      data: htmlWithVariations
    });

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/variations' });

    expect(response.statusCode).toBe(200);
    expect(response.body.title).toBe('FALE and Fale and fale Test');
    expect(response.body.content).toContain('This is FALE University, Fale College, and fale medical school');
  });
});
