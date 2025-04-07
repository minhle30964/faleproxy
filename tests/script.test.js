/**
 * @jest-environment jsdom
 */

// Mock fetch API
global.fetch = jest.fn();

describe('Client-side Script', () => {
  // Setup the DOM environment before each test
  beforeEach(() => {
    // Create the HTML structure that script.js expects
    document.body.innerHTML = `
      <form id="url-form">
        <input id="url-input" type="text">
        <button type="submit">Submit</button>
      </form>
      <div id="loading" class="hidden"></div>
      <div id="error-message" class="hidden"></div>
      <div id="result-container" class="hidden">
        <div id="info-bar">
          <span>Original URL: <a id="original-url" href="#"></a></span>
          <span>Page Title: <span id="page-title"></span></span>
        </div>
        <div id="content-display"></div>
      </div>
    `;

    // Reset mocks
    fetch.mockClear();
    
    // Load the script
    require('../public/script.js');
    
    // Trigger DOMContentLoaded
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
  });

  // Test form submission with empty URL
  test('should show error when URL is empty', () => {
    // Get form elements
    const form = document.getElementById('url-form');
    const input = document.getElementById('url-input');
    const errorMessage = document.getElementById('error-message');
    
    // Set empty input
    input.value = '';
    
    // Submit the form
    form.dispatchEvent(new Event('submit'));
    
    // Check if error message is displayed
    expect(errorMessage.classList.contains('hidden')).toBe(false);
    expect(errorMessage.textContent).toBe('Please enter a valid URL');
    expect(fetch).not.toHaveBeenCalled();
  });

  // Test successful form submission
  test('should fetch and display content when URL is valid', async () => {
    // Mock successful fetch response
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        content: '<html><body><h1>Fale University</h1></body></html>',
        title: 'Fale University',
        originalUrl: 'https://example.com'
      })
    };
    fetch.mockResolvedValue(mockResponse);
    
    // Get form elements
    const form = document.getElementById('url-form');
    const input = document.getElementById('url-input');
    const loading = document.getElementById('loading');
    const resultContainer = document.getElementById('result-container');
    
    // Set valid input
    input.value = 'https://example.com';
    
    // Submit the form
    form.dispatchEvent(new Event('submit'));
    
    // Check if loading indicator is shown
    expect(loading.classList.contains('hidden')).toBe(false);
    
    // Wait for the async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check if fetch was called correctly
    expect(fetch).toHaveBeenCalledWith('/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: 'https://example.com' })
    });
    
    // Check if result container is shown
    expect(resultContainer.classList.contains('hidden')).toBe(false);
    
    // Check if loading indicator is hidden
    expect(loading.classList.contains('hidden')).toBe(true);
    
    // Check if original URL and title are set
    const originalUrlElement = document.getElementById('original-url');
    const pageTitleElement = document.getElementById('page-title');
    expect(originalUrlElement.textContent).toBe('https://example.com');
    expect(pageTitleElement.textContent).toBe('Fale University');
    
    // Check if iframe was created
    const contentDisplay = document.getElementById('content-display');
    expect(contentDisplay.querySelector('iframe')).not.toBeNull();
  });

  // Test error handling
  test('should show error message when fetch fails', async () => {
    // Mock failed fetch response
    const mockResponse = {
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: 'Failed to fetch content'
      })
    };
    fetch.mockResolvedValue(mockResponse);
    
    // Get form elements
    const form = document.getElementById('url-form');
    const input = document.getElementById('url-input');
    const errorMessage = document.getElementById('error-message');
    
    // Set valid input
    input.value = 'https://example.com';
    
    // Submit the form
    form.dispatchEvent(new Event('submit'));
    
    // Wait for the async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check if error message is displayed
    expect(errorMessage.classList.contains('hidden')).toBe(false);
    expect(errorMessage.textContent).toBe('Failed to fetch content');
  });

  // Test network error handling
  test('should show error message when network error occurs', async () => {
    // Mock network error
    fetch.mockRejectedValue(new Error('Network error'));
    
    // Get form elements
    const form = document.getElementById('url-form');
    const input = document.getElementById('url-input');
    const errorMessage = document.getElementById('error-message');
    
    // Set valid input
    input.value = 'https://example.com';
    
    // Submit the form
    form.dispatchEvent(new Event('submit'));
    
    // Wait for the async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check if error message is displayed
    expect(errorMessage.classList.contains('hidden')).toBe(false);
    expect(errorMessage.textContent).toBe('Network error');
  });
});
