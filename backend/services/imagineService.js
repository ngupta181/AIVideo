const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');

const IMAGINE_API_KEY = process.env.IMAGINE_API_KEY;
const IMAGINE_API_URL = 'https://api.imaginepro.ai/api/v1/midjourney/imagine';
const IMAGINE_STATUS_URL = 'https://api.imaginepro.ai/api/v1/midjourney/message';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateImage = async (query, outputPath) => {
    try {
        const prompt = `${query}`.trim();

        console.log(`Sending request to Imagine API with prompt: "${prompt}"`);

        const response = await axios.post(IMAGINE_API_URL, {
            prompt: prompt,
            negative_prompt: "",
            width: 1024,
            height: 1024,
            steps: 30,
            guidance_scale: 7.5,
            button: "U1",
            model_id: "stable-diffusion-v1-5",
            scheduler: "dpmsolver++",
            num_images: 1,
            safety_checker: true,
            enhance_prompt: false,
            seed: null,
            webhook: null,
            track_id: null
        }, {
            headers: {
                'Authorization': `Bearer ${IMAGINE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.success && response.data.messageId) {
            console.log(`Job accepted. Message ID: ${response.data.messageId}`);
            const imageUrl = await pollForResult(response.data.messageId);
            if (imageUrl) {
                await downloadAndProcessImage(imageUrl, outputPath);
                console.log(`Image processed and saved to ${outputPath}`);
                await splitImage(outputPath, path.dirname(outputPath));
                return outputPath;
            }
        }

        throw new Error('Failed to get a valid response from the Imagine API');
    } catch (error) {
        console.error('Error in generateImage function:', error);
        throw new Error(`Failed to generate image: ${error.message}`);
    }
};

const pollForResult = async (messageId, maxAttempts = 30, interval = 10000) => {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const statusResponse = await axios.get(`${IMAGINE_STATUS_URL}/${messageId}`, {
                headers: { 'Authorization': `Bearer ${IMAGINE_API_KEY}` }
            });

            console.log(`Attempt ${i + 1}: Status - ${statusResponse.data.status}, Progress: ${statusResponse.data.progress}%`);

            if (statusResponse.data.status === 'DONE' && statusResponse.data.uri) {
                return statusResponse.data.uri;
            } else if (statusResponse.data.status === 'FAILED') {
                throw new Error('Image generation failed');
            }

            if (i < maxAttempts - 1) {
                console.log(`Waiting ${interval / 1000} seconds for next attempt...`);
                await sleep(interval);
            }
        } catch (error) {
            console.error(`Error checking job status: ${error.message}`);
            throw error;
        }
    }
    throw new Error('Max polling attempts reached. Job timed out.');
};

const downloadAndProcessImage = async (imageUrl, outputPath) => {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, response.data);
    console.log(`Raw image data saved to ${outputPath}`);
};


const splitImage = async (inputPath, outputDir) => {
    try {
        const img = sharp(inputPath);
        const metadata = await img.metadata();
        const { width, height } = metadata;

        console.log(`Original image dimensions: ${width}x${height}`);

        const subWidth = Math.floor(width / 2);
        const subHeight = Math.floor(height / 2);

        const region = { left: 0, top: 0, width: subWidth, height: subHeight };
        console.log(`Processing region 1: ${JSON.stringify(region)}`);

        const outputPath = path.join(outputDir, `sub_image_1.png`);
        
        try {
            await img
                .extract(region)
                .toFile(outputPath);

            console.log(`Saved ${outputPath}`);
        } catch (subError) {
            console.error(`Error processing region 1:`, subError);
            console.error(`Region details: ${JSON.stringify(region)}`);
        }
    } catch (error) {
        console.error('Error in splitImage function:', error);
        throw error;
    }
};

module.exports = { generateImage };