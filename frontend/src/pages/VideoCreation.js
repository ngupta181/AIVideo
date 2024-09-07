import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const CreateVideo  = () => {
    const [topic, setTopic] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [imageService, setImageService] = useState('storyblock');

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const token = localStorage.getItem('token');
            let endpoint = 'http://localhost:5000/api/video/create';
            
            // Change the endpoint if DALL-E 3 is selected
            if (imageService === 'dalle3') {
                endpoint = 'http://localhost:5000/api/video/create-image-video';
            }

            const response = await axios.post(endpoint, 
                { topic, imageService },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            setMessage('Video created successfully');
            navigate(`/VideoEditor/${response.data.videoId}`);
        } catch (error) {
            setMessage('Error creating video');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 min-h-screen p-6 flex items-center justify-center">
            <div className="w-full max-w-lg">
                <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg shadow-lg">
                    {loading ? (
                        <video width="320px" height="240px" controls autoPlay loop>
                            <source src="/film_grain.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    ) 
                    : (
                        <form onSubmit={handleSubmit}>
                            <textarea
                                className="w-full h-40 p-4 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                                placeholder="Give me a topic, language and detailed instructions"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                            ></textarea>
                            <div className="flex justify-between items-center mt-4">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{topic.length}/25000</span>
                                <div className="flex items-center">
                                    <select
                                        className="mr-4 p-2 border rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200"
                                        value={imageService}
                                        onChange={(e) => setImageService(e.target.value)}
                                    >
                                        <option value="storyblock">StoryBlock</option>
                                        <option value="dalle3">DALL-E 3</option>
                                    </select>
                                    <button
                                        className="bg-blue-500 text-white hover:bg-blue-600 py-2 px-4 rounded-lg transform transition-transform duration-200 hover:scale-105 flex items-center"
                                        type="submit"
                                    >
                                        <Sparkles className="mr-2" size={16} />
                                        Generate a video
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                    {message && <p className={`mt-2 ${message.includes('successfully') ? 'text-green-500' : 'text-red-500'}`}>{message}</p>}
                </div>
            </div>
        </div>
    );
};

export default CreateVideo;