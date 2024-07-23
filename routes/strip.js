const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const extractContentText = require('../utils/extractContentText');
const myCache = require('../cache');
const url = require('url');

// Function to fetch content using Puppeteer with retries and timeouts
const fetchContentWithPuppeteer = async (originalUrl) => {
  console.log(`🚀 Fetching content for ${originalUrl} using Puppeteer...`);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  try {
    await page.goto(originalUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    const html = await page.content();
    console.log(`✅ Successfully fetched content for ${originalUrl}`);
    return html;
  } catch (err) {
    console.error(`❌ Error fetching content with Puppeteer for ${originalUrl}:`, err.message || err);
    throw new Error('Failed to render content with Puppeteer');
  } finally {
    await browser.close();
    console.log(`🔒 Browser closed after fetching content for ${originalUrl}`);
  }
};

// Function to handle URL optimization
const optimizeURL = async (originalUrl) => {
  try {
    // Check if the response is cached
    const cachedResponse = myCache.get(originalUrl);
    if (cachedResponse) {
      console.log(`🎯 Cache hit for ${originalUrl}`);
      return cachedResponse;
    }

    console.log(`🔍 Cache miss for ${originalUrl}`);

    // Fetch content using Puppeteer
    const html = await fetchContentWithPuppeteer(originalUrl);

    const { title, description, contentText } = await extractContentText(html, originalUrl);

    const immersiveReaderHTML = `
      <!DOCTYPE html>
      <html lang="en-us">
      <head>
        <title>PageOptimizer - ${title}</title>
        <meta name="description" content="${description}">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" />
        <link rel="stylesheet" href="/main.css" />
      </head>
      <body>
        <aside class="sidebar">
          <button id="increase-font" title="Increase Font Size">
            <img width="30" height="30" src="https://img.icons8.com/ios-glyphs/30/increase-font.png" alt="increase-font"/>
          </button>
          <button id="decrease-font" title="Decrease Font Size">
            <img width="30" height="30" src="https://img.icons8.com/ios-glyphs/30/decrease-font.png" alt="decrease-font"/>
          </button>
          <button id="toggle-contrast" title="Toggle High Contrast">
            <img width="24" height="24" src="https://img.icons8.com/external-gradak-royyan-wijaya/24/external-dark-gradak-weather-gradak-royyan-wijaya.png" alt="external-dark-gradak-weather-gradak-royyan-wijaya"/>
          </button>
        </aside>
        <nav class="search-bar">
          <a href="/" class="no-link"><h1 class="brand">Page Optimizer</h1></a>
          <form action="http://localhost:3000/strip" method="GET">
            <label for="url">URL</label>
            <input type="url" id="url" name="url" placeholder="Enter URL" value="${originalUrl}" required>
            <button type="submit">Optimize Webpage</button>
          </form>
        </nav>
        <main>
          <header>
            <h1>${title}</h1>
            <a href="${originalUrl}">${url.resolve(originalUrl, '/')}</a>
            <p>${description}</p>
          </header>
          <div class="immerse-reader">
            <div class="table-container">
              ${contentText}
            </div>
          </div>
        </main>
        <script src="/script.js"></script>
      </body>
      </html>
    `;

    // Cache the response
    myCache.set(originalUrl, immersiveReaderHTML, (err) => {
      if (err) {
        console.error(`❌ Failed to cache response for ${originalUrl}: ${err}`);
      } else {
        console.log(`📦 Cached response for ${originalUrl}`);
      }
    });

    return immersiveReaderHTML;
  } catch (err) {
    console.error(`❌ Error optimizing URL ${originalUrl}:`, err.message || err);
    throw new Error('Error optimizing URL');
  }
};

// Router endpoint
router.get('/', async (req, res) => {
  const originalUrl = req.query.url;

  if (!originalUrl) {
    return res.status(400).send('URL parameter is required');
  }

  try {
    const optimizedHTML = await optimizeURL(originalUrl);
    res.send(optimizedHTML);
  } catch (err) {
    res.status(500).send('Error optimizing URL');
  }
});

module.exports = router;
