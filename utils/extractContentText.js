const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const axios = require('axios');
const url = require('url');
const sharp = require('sharp');

const fileExtensionPattern = /\.(pdf|docx|xlsx|pptx|zip|rar|tar\.gz|7z|csv|txt|jpe?g|png|gif|bmp|svg|mp3|wav|mp4|mov|avi|flv|mkv|psd|ai|eps|indd|rtf|odt|ods|odp|xml|json|sql|db|dbf|mdb|iso|bin|exe|msi|dll|bat|apk|ipa|app|dmg|pkg|deb|rpm|tar\.bz2|tar\.xz|tgz|gz|bz2|xz|swf|fla|as|class|jar|py|cpp|c|h|cs|java|rb|pl|ts|go|sh|bat|swift|kt|rs)$/i;

const parseImages = async (imageTag, baseUrl) => {
    const imgResponse = await axios.get(imageTag.src, { responseType: 'arraybuffer' });

    const webpBuffer = await sharp(imgResponse.data)
        .webp({ quality: 80 })
        .toBuffer();

    const base64WebP = webpBuffer.toString('base64');
    const src = `data:image/webp;base64,${base64WebP}`;
    const alt = imageTag.alt || 'n/a';

    let currentElement = imageTag;
    let parentLink = currentElement.closest('a');
    if (parentLink) {
        parentLink.outerHTML = `<img alt="${alt || src}" src="${src}"/>`
        currentElement = parentLink
    }
}

const parseLinks = async (linkTag, base) => {
    if (linkTag.href.match(fileExtensionPattern)) {
        const name = linkTag.innerText || linkTag.href.split('/').pop();

        linkTag.href = url.resolve(base, linkTag.href);

        const size = await getFileSize(linkTag.href);
        const readableSize = parseInt(size, 10) > 1024 * 1024 ? `${(parseInt(size, 10) / (1024 * 1024)).toFixed(2)} MB` 
        : parseInt(size, 10) > 1024 ? `${(parseInt(size, 10) / 1024).toFixed(2)} KB` 
        : `${size} bytes`;
        linkTag.innerHTML = `<button class="download" title="${linkTag.href}">Download File: ${name} (${readableSize})</button>`;

    }
    else {
        const href = url.resolve(base, linkTag.getAttribute('href'));
        linkTag.setAttribute('href', `http://localhost:3000/strip?url=${encodeURIComponent(href)}`);
    }
}

async function getFileSize(url) {
    try {
        const response = await axios.head(url);
        return response.headers['content-length'];
    } catch (error) {
        console.error(`Failed to get file size for ${url}: ${error}`);
        return 'unknown';
    }
}

async function extractContentText(html, base) {
    const { window } = new JSDOM(html);
    const title = window.document.title; // Get the title of the page
    const descriptionMetaTag = window.document.querySelector('meta[name="description"]');
    const description = descriptionMetaTag ? descriptionMetaTag.content : ''; // Get the description of the page

    let reader = new Readability(window.document);
    let article = reader.parse();

    // Create a new JSDOM instance with the parsed content
    const { window: parsedWindow } = new JSDOM(article.content);

    const images = parsedWindow.document.querySelectorAll('img');
    await Promise.allSettled(Array.from(images).map(async (img) => parseImages(img, base)));

    const links = parsedWindow.document.querySelectorAll('a');
    await Promise.allSettled(Array.from(links).map(async (link) => parseLinks(link, base)));

    return {
        title: article.title || title,
        description: article.excerpt || description,
        contentText: parsedWindow.document.body.innerHTML
    };
}

module.exports = extractContentText;