const axios = require('axios');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const generateScript = async (topic) => {
    const prompt = `
        You are a Script Writer who creates engaging YouTube Shorts videos on any topic. 
        We will provide you with an idea for the video along with some reference content. Using this idea, create a script for a 60-second video (approximately 140 words).

        The script should include:
        1. A clickbait title (make it super interesting, include numbers, and maybe an open question).
        2. A video description optimized for more tags for YouTube and Google search.
        3. The actual video content, which will be composed using Storyblocks content. For each part of the text, provide a search query to find matching videos on Storyblocks.

        Guidelines:
        - Make the video engaging, include different stories, history, and make it fun at some points.
        - Avoid lists (e.g., 1), 2), etc.) and symbols that are not usually spoken in videos. Use only words and numbers.
        - The text will be used for voice-over, so it should sound natural.
        - Always include pairs of ###QUERY and ###TEXT for each part. A new query should be included every 10-30 seconds.
        - The initial 1st minute of the video should be more dynamic and contain more queries (around 10 seconds each).
        - End the video by asking viewers to like, share, and subscribe to the channel.

        Please provide the output in the following format:

        ###TITLE: <Title for the YouTube video>
        ###DESCRIPTION: <Description for the YouTube video>
        ###CONTENT:
            ###TEXT: <Text of what you will say in the video, this should complement the query video which will be shown in the video>
            ###QUERY: <Text of what video I should search on Storyblocks to match the text above, the query should be short, 1-2 words max, and should be as general as possible but on the given topic>

        Always include pairs of ###QUERY and ###TEXT for the next parts. A video should have a new query around every 10-30 seconds. The initial 1st minute of the video should be more dynamic and contain more queries (around 10 seconds each). End the video by asking viewers to like, share, and subscribe to the channel.
    `;

    
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: `${topic}` }
            ],
            max_tokens: 4096
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
        });
        return response.data.choices[0].message.content;
        //const scriptJson = JSON.parse(response.data.choices[0].message.content);
        //return scriptJson.script;
    } catch (error) {
        console.error('Error generating script:', error.response ? error.response.data : error.message);
        throw error;
    }
};

const aiVideoGenerationScript = async (topic) => {
    const prompt = `You are a Script Writer who creates engaging YouTube Shorts videos on any topic. We will provide you with an idea for the video along with some reference content. Using this idea, create a script for a 60-second video (approximately 140 words).

    The script should include:
    
    A clickbait title (make it super interesting, include numbers, and maybe an open question).
    A video description optimized with more tags for YouTube and Google search.
    The actual video content, which will be composed using Images generated from Midjourney. For each part of the text, provide a prompt for imeage generation query to matching.
    Guidelines:
    
    Make the video engaging, including different stories, history, and some fun points.
    Avoid lists (e.g., 1), 2), etc.) and symbols that are not usually spoken in videos. Use only words and numbers.
    The text will be used for voice-over, so it should sound natural.
    Always include pairs of ###QUERY and ###TEXT for each part. A new query should be included every 10-30 seconds.
    The initial minute of the video should be more dynamic and contain more queries (around 10 seconds each).
    End the video by asking viewers to like, share, and subscribe to the channel.
    Please provide the output in the following format:
    
    ###TITLE: <Title for the YouTube video>
    ###DESCRIPTION: <Description for the YouTube video>
    ###CONTENT:
    ###TEXT: <Text of what you will say in the video, this should complement the query video which will be shown in the video>
    ###QUERY: <pompt of what image I should create to match the text above, and should be as general as possible but on the given topic>
    
    Always include pairs of ###QUERY and ###TEXT for the next parts. A video should have a new query around every 10-30 seconds. The initial minute of the video should be more dynamic and contain more queries (around 10 seconds each). End the video by asking viewers to like, share, and subscribe to the channel.`;
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: `${topic}` }
            ],
            max_tokens: 4096
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
        });
        return response.data.choices[0].message.content;
        //const scriptJson = JSON.parse(response.data.choices[0].message.content);
        //return scriptJson.script;
    } catch (error) {
        console.error('Error generating script:', error.response ? error.response.data : error.message);
        throw error;
    }
};

//module.exports = { generateScript, processScript };

module.exports = { generateScript , aiVideoGenerationScript};

