const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PageOptimizer</title>
          <meta name="description" content="Optimize and speed up your webpage">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" />
          <link rel="stylesheet" href="/main.css" />
        </head>
        <body>
        <div class="home-main">
          <div class="container">
            <h1>PageOptimizer</h1>
            <p>Enter a Term to Search on Wikipedia and Khan Academy.</p>
            <div class="search-bar">
              <form action="/explore" method="GET">
                <input type="s" id="s" name="s" placeholder="quantum mechnics" required>
                <button type="submit">Search</button>
              </form>
            </div>
          <p>Enter a URL to optimize and speed up your webpage.</p>
            <div class="search-bar">
              <form action="/strip" method="GET">
                <input type="url" id="url" name="url" placeholder="https://example.com" required>
                <button type="submit">Optimize Webpage</button>
              </form>
            </div>
          </div>
        </div>
        </body>
      </html>
    `)
});

module.exports = router;