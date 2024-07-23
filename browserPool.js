const genericPool = require("generic-pool");
const puppeteer = require('puppeteer');

const browserPool = genericPool.createPool({
  create: () => puppeteer.launch(),
  destroy: (browser) => browser.close()
}, { max: 2 });

module.exports = browserPool;