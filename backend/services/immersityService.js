const axios = require('axios');
const fs = require('fs').promises;
const FormData = require('form-data');

const IMMERSITY_API_KEY = process.env.IMMERSITY_API_KEY;
const IMMERSITY_API_URL = 'https://api.immersity.ai/api/v1/animation';

const animateImage = async (inputImagePath, outputVideoPath, motion = 'zoom-in', duration = 5, fps = 30) => {
    try {
        const formData = new FormData();
        formData.append('image', await fs.readFile(inputImagePath), 'image.png');
        formData.append('motion', motion);
        formData.append('duration', duration.toString());
        formData.append('fps', fps.toString());
        formData.append('animationType', 'mp4');
        formData.append('width', '1080');
        formData.append('height', '1920');

        const response = await axios.post(IMMERSITY_API_URL, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${IMMERSITY_API_KEY}`,
            },
            responseType: 'arraybuffer'
        });

        await fs.writeFile(outputVideoPath, response.data);
        console.log(`Animated video saved to ${outputVideoPath}`);
    } catch (error) {
        console.error('Error animating image:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        throw error;
    }
};

module.exports = { animateImage };