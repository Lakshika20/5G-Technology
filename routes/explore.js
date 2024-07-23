const express = require('express');
const router = express.Router();
const axios = require('axios');
const { JSDOM } = require('jsdom');
const browserPool = require('../browserPool');
const NodeCache = require('node-cache');
const url = require('url');

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // Cache TTL: 10 minutes

const DEFAULT_TIMEOUT = 3000;

const convertUrl = (remoteUrl) => remoteUrl ? `/strip?url=${encodeURIComponent(remoteUrl)}` : '#';

router.get('/', async (req, res) => {
  const topic = req.query.s;
  console.log('🔍 Exploring the vast universe of:', topic);
  if (!topic) {
    console.log('🚫 Whoops! Forgot to tell us what to search for!');
    return res.status(400).send('search parameter is required');
  }

  // Check if the response is already in cache
  const cachedResponse = cache.get(topic);
  if (cachedResponse) {
    console.log('🤫 Shhh... This is our little secret (from cache).');
    return res.send(cachedResponse);
  }

  try {
    console.log('🌌 Launching into the cosmos of information...');
    const [
      wikipediaData,
      TEDData,
      //pbsData
    ] = await Promise.allSettled([
      searchWikipediaByQuery(topic),
      searchTEDByQuery(topic),
      //searchPBSByQuery(topic)
    ]);

    const responseData = generateHTML(
      topic,
      wikipediaData.status === 'fulfilled' ? wikipediaData.value : [],
      TEDData.status === 'fulfilled' ? TEDData.value : [],
      []//pbsData.status === 'fulfilled' ? pbsData.value : [],
    );

    // Cache the response data
    console.log('🔮 Storing the wisdom in the cache...');
    cache.set(topic, responseData);

    console.log('✨ Behold the treasure of knowledge!');
    res.send(responseData);
  } catch (error) {
    console.error('🔥 Everything is on fire:', error);
    res.status(500).send('Error fetching content');
  }
});

async function searchWikipediaByQuery(topic) {
  const wikipediaUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(topic)}&limit=5&namespace=0&format=json`;
  try {
    console.log('📚 Diving into Wikipedia for:', topic);
    const { data } = await axios.get(wikipediaUrl);
    console.log('📚 Retrieved data from Wikipedia');
    return data[1].map((title, index) => ({
      title,
      url: data[3][index],
    }));
  } catch (error) {
    console.error('🚨 Wikipedia search mission failed:', error.message || 'N/A');
    return [];
  }
}

async function searchTEDByQuery(topic) {
  const searchUrl = `https://www.ted.com/search?cat=blog_posts&q=${encodeURIComponent(topic)}`;
  const results = [];
  const html = await fetch(searchUrl, { timeout: DEFAULT_TIMEOUT }).then(response => response.text());

  const { document } = new JSDOM(html).window;
  const searchResultsContainer = document.querySelectorAll('.search__result');

  Array.from(searchResultsContainer).map(element => {
    const title = element.querySelector('h3 a').textContent.trim();
    const link = element.querySelector('h3 a').href;
    const description = element.querySelector('.search__result__description').textContent.trim();
    const date = element.querySelector('.search__result__kicker').textContent.trim();
    results.push({ title, link, description, date });
  })

  console.log('🔍 TED treasures found:', results.length);

  return results.length > 6 ? results.slice(0, 6) : results;
}

async function searchKhanAcademyByQuery(topic) {
  const searchUrl = `https://www.khanacademy.org/search?search_again=1&page_search_query=${encodeURIComponent(topic)}&content_kinds=Article`;

  console.log('🏫 Sneaking into Khan Academy for:', topic);
  const browser = await browserPool.acquire();
  const page = await browser.newPage();
  let resultsArray = [];
  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: DEFAULT_TIMEOUT });

    resultsArray = await page.evaluate(() => {
      console.log('🕵️‍♂️ Inside Khan Academy, looking around...');
      const searchResultsContainer = document.querySelector('#indexed-search-results ul');
      if (!searchResultsContainer) return [];

      return Array.from(searchResultsContainer.querySelectorAll('li')).map(element => {
        const linkElement = element.querySelector('a');
        const titleElement = linkElement.querySelector('._2dibcm7');
        const descriptionElement = linkElement.querySelector('._w68pn83');
        const typeElement = linkElement.querySelector('._1ufuji7');
        const gradeElement = linkElement.querySelector('._12itjrk5');

        return {
          url: linkElement.href || '',
          title: titleElement?.textContent || '',
          description: descriptionElement?.textContent || '',
          type: typeElement?.textContent || '',
          grade: gradeElement?.textContent || ''
        };
      });
    });

    console.log('🎓 Khan Academy treasures found:', resultsArray.length);

    console.log('🎒 Packed the knowledge, heading back!');
  } catch (error) {
    console.error('🚨 Khan Academy search mission failed:', error?.message || 'N/A');
    return [];
  }
  await page.close(); // Close the page instead of the entire browser
  return resultsArray;

}

async function searchPBSByQuery(topic) {
  const url = `https://www.pbs.org/wgbh/nova/?s=${encodeURIComponent(topic)}`;
  let browser;
  try {
    console.log('📺 Tuning into PBS for:', topic);
    browser = await browserPool.acquire();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: DEFAULT_TIMEOUT });

    console.log('🔍 Scouring PBS for gems...');
    const articles = await page.evaluate(() => {
      const articlesArray = [];

      document.querySelectorAll('script').forEach(script => script.remove());
      document.querySelectorAll('style').forEach(style => style.remove());
      const articlesNodeList = document.querySelectorAll('.jsx-d3b8ce160a29d06.results article');

      articlesNodeList.forEach(article => {
        const title = article.querySelector('h3')?.innerText || '';
        const url = article.querySelector('a')?.href || '';
        const description = article.querySelector('.description p')?.innerText || '';
        const type = article.querySelector('span')?.innerText || '';
        articlesArray.push({ title, url, description, type });
      });

      return articlesArray;
    });

    console.log('🔮 PBS treasures found:', articles.length);
    console.info('🚀 Mission accomplished! Returning with PBS treasures.')
    await page.close(); // Close the page instead of the entire browser
    return articles;
  } catch (error) {
    console.error('🚨 PBS search mission failed:', error?.message || 'N/A');
    return [];
  } finally {
    if (browser) {
      await browserPool.release(browser); // Safely release the browser if it was acquired
    }
  }
}

function generateHTML(topic, wikipediaContent, TedContent, pbsContent) {
  const contentSection = (title, content, fields) => `
    <article>
      <h2>${title}</h2>
      ${content?.map(result => `
        <div class="result-card">
          <h3><a href="${convertUrl(result.url)}">${result.title}</a></h3>
          ${fields.map(field => result[field] ? `<p><strong>${field.charAt(0).toUpperCase() + field.slice(1)}:</strong> ${result[field]}</p>` : '').join('')}
        </div>
      `).join('') || '<p>No results found</p>'}
    </article>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="description" content="Explore content related to ${topic}">
      <title>Explore - ${topic}</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" />
      <link rel="stylesheet" href="/main.css" />
    </head>
    <body>
      <nav class="search-bar">
        <a href="/" class="no-link"><h1 class="brand">Page Optimizer</h1></a>
        <form action="http://localhost:3000/explore" method="GET">
          <label for="s">Topic</label>
          <input type="text" id="s" name="s" placeholder="Enter Topic" value="${topic}" required>
          <button type="submit">Search Web</button>
        </form>
      </nav>
      <main>
        <section class="content-section">
          <h1 class="main-title">Explore</h1>
          ${contentSection('Wikipedia', wikipediaContent, [])}
          ${contentSection('PBS Nova', pbsContent, ['description', 'type'])}
          ${contentSection('TED Articles', TedContent, [])}
        </section>
      </main>
      <footer>
        <p>&copy; ${new Date().getFullYear()} Page Optimizer. All rights reserved.</p>
      </footer>
      <script src="/script.js"></script>
    </body>
    </html>
  `;
}


module.exports = router;
