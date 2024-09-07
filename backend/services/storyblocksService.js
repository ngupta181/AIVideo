const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const STORYBLOCKS_API_URL = 'https://api.videoblocks.com/api/v2/videos/search';
const PUBLIC_KEY = process.env.STORYBLOCKS_PUBLIC_KEY;
const PRIVATE_KEY = process.env.STORYBLOCKS_PRIVATE_KEY;

const searchVideos = async (keywords, page = 1, resultsPerPage = 3) => {
    try {
        console.log("Making request to Storyblocks with keywords:", keywords);

        const encodedApiKey = Buffer.from(`${PUBLIC_KEY}:${PRIVATE_KEY}`).toString('base64');

        const response = await axios.get(STORYBLOCKS_API_URL, {
            params: {
                project_id: PUBLIC_KEY,
                user_id: PRIVATE_KEY,
                keywords: keywords,
                content_type: 'footage',
                page: page,
                results_per_page: resultsPerPage,
                sort_by: 'most_relevant',
                sort_order: 'DESC',
                quality: 'HD'
            },
            headers: {
                'Authorization': `Basic ${encodedApiKey}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching videos from Storyblocks:', error.response ? error.response.data : error.message);
        return { results: [] };
    }
};

const ensureDirectoryExistence = (filePath) => {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
};

const downloadVideo = async (url, downloadPath) => {
    ensureDirectoryExistence(downloadPath);
    const writer = fs.createWriteStream(downloadPath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

module.exports = { searchVideos, downloadVideo };
