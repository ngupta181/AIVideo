const axios = require('axios');
const fs = require('fs').promises;

const LEONARDO_API_URL = process.env.LEONARDO_API_URL;
const LEONARDO_MOTION_API_URL = process.env.LEONARDO_MOTION_API_URL;
const LEONARDO_PROMPT_IMPROVE_URL = process.env.LEONARDO_PROMPT_IMPROVE_URL;

async function improvePrompt(prompt) {
    try {
        console.log(`Attempting to improve prompt: ${prompt}`);
        const response = await axios.post(LEONARDO_PROMPT_IMPROVE_URL, 
            { prompt },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Prompt improvement response:', response.data);
        return response.data.promptGeneration.prompt;
    } catch (error) {
        console.error('Error improving prompt:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        return prompt; // Return original prompt if improvement fails
    }
}

async function generateImage(query, outputPath, width, height) {
    try {
        // Improve the prompt before image generation
        const improvedQuery = await improvePrompt(query);
        console.log(`Original query: ${query}`);
        console.log(`Improved query: ${improvedQuery}`);

        console.log(`Attempting to generate image with improved query: ${improvedQuery}`);
        const response = await axios.post(LEONARDO_API_URL, {
            prompt: improvedQuery,
            modelId: 'aa77f04e-3eec-4034-9c07-d0f619684628', // Default to Leonardo Creative
            height: 1024,
            num_images: 1,
            presetStyle: 'CINEMATIC',
            width: 576,
            negative_prompt: "blurry, low quality",
            public: false,
            photoReal: true,
            photoRealVersion:"v2",
            alchemy: true,     
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // Set a timeout of 30 seconds
        });

        console.log('Leonardo API response:', response.data);

        const generationId = response.data.sdGenerationJob.generationId;
        const imageData = await pollForGeneratedImage(generationId);

        // Download the image
        console.log(`Downloading image from: ${imageData.url}`);
        const imageResponse = await axios.get(imageData.url, { 
            responseType: 'arraybuffer',
            timeout: 30000 // Set a timeout of 30 seconds
        });
        await fs.writeFile(outputPath, imageResponse.data);

        console.log(`Image generated and saved to: ${outputPath}`);
        return { generationId, imageId: imageData.id };
    } catch (error) {
        console.error('Error generating image with Leonardo AI:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        throw error;
    }
}

async function pollForGeneratedImage(generationId, maxAttempts = 10, interval = 5000) {
    const getGenerationUrl = `${LEONARDO_API_URL}/${generationId}`;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await axios.get(getGenerationUrl, {
                headers: {
                    'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`,
                },
            });

            if (response.data.generations_by_pk.status === 'COMPLETE') {
                const generatedImage = response.data.generations_by_pk.generated_images[0];
                return {
                    url: generatedImage.url,
                    id: generatedImage.id                 
                };
            }

            // If not complete, wait before trying again
            await new Promise(resolve => setTimeout(resolve, interval));
        } catch (error) {
            console.error(`Error polling for generated image (attempt ${attempt + 1}):`, error.message);
        }
    }

    throw new Error('Max attempts reached while polling for generated image');
}

/* const generateMotion = async (imageId) => {
    try {
        console.log(`Attempting to generate motion for image: ${imageId}`);
        const response = await axios.post(LEONARDO_MOTION_API_URL, {
            imageId
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // Set a timeout of 30 seconds
        });

        console.log('Leonardo Motion API response:', JSON.stringify(response.data, null, 2));

        return response.data; // This should contain the motionSvdGenerationJob object
    } catch (error) {
        console.error('Error generating motion with Leonardo AI:', error.message);
        if (error.response) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            console.error('Response status:', error.response.status);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error setting up request:', error.message);
        }
        throw error;
    }
}

const pollForMotionVideo = async (generationId, initialInterval = 5000, maxDuration = 30 * 60 * 1000) => {
    console.log(`Starting to poll for motion video. Generation ID: ${generationId}`);
    
    let attempt = 1;
    let interval = initialInterval;
    const startTime = Date.now();

    while (Date.now() - startTime < maxDuration) {
        try {
            console.log(`Polling attempt ${attempt} for generation ID: ${generationId}`);
            const getMotionUrl = `${LEONARDO_API_URL}/${generationId}`;
            
            const response = await axios.get(getMotionUrl, {
                headers: {
                    'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`,
                },
            });

            console.log('Motion video poll response:', JSON.stringify(response.data, null, 2));

            if (response.data.generations_by_pk.status === 'COMPLETE') {
                const generatedImage = response.data.generations_by_pk.generated_images[0];
                console.log('Generated Image Data:', JSON.stringify(generatedImage, null, 2));
                
                if (generatedImage.motionMP4URL) {
                    console.log('Motion video URL found:', generatedImage.motionMP4URL);
                    return {
                        motionMP4URL: generatedImage.motionMP4URL,
                        id: generatedImage.id,
                    };
                } else {
                    console.log('Motion video URL not found in the response');
                    // If motionMP4URL is not available, check for other potential fields
                    const potentialVideoURLs = [
                        generatedImage.url,
                        generatedImage.mp4Url,
                        generatedImage.videoUrl,
                        // Add any other potential field names here
                    ];
                    
                    for (const url of potentialVideoURLs) {
                        if (url && url.endsWith('.mp4')) {
                            console.log('Potential motion video URL found:', url);
                            return {
                                motionMP4URL: url,
                                id: generatedImage.id,
                            };
                        }
                    }
                }
            } else if (response.data.generations_by_pk.status === 'FAILED') {
                throw new Error('Motion video generation failed');
            }

            // If not complete, wait before trying again
            await new Promise(resolve => setTimeout(resolve, interval));
            attempt++;
            interval = Math.min(interval * 1.5, 60000); // Exponential backoff, max 1 minute
        } catch (error) {
            console.error(`Error in polling attempt ${attempt}:`, error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
                if (error.response.status === 429) {
                    console.log('Rate limit reached. Waiting for a longer period before next attempt.');
                    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 1 minute
                }
            }
            // Continue to next attempt
            await new Promise(resolve => setTimeout(resolve, interval));
            attempt++;
            interval = Math.min(interval * 1.5, 60000); // Exponential backoff, max 1 minute
        }
    }

    throw new Error(`Max duration reached (${maxDuration / 60000} minutes) while polling for motion video`);
};
 */
//module.exports = { generateImage, generateMotion, pollForMotionVideo, improvePrompt };
module.exports = { generateImage, improvePrompt };