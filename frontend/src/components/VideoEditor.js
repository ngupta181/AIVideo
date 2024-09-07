import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import ReactPlayer from 'react-player';
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import * as Tabs from '@radix-ui/react-tabs';
import { X, Play } from 'lucide-react';

const VideoEditor = () => {
    const { videoId } = useParams();
    const [video, setVideoData] = useState(null);
    const [currentScript, setCurrentScript] = useState([]);
    const [currentMediaFiles, setCurrentMediaFiles] = useState([]);
    const [error, setError] = useState(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchVideoData = async () => {
            try {
                if (!token) {
                    setError('No authentication token found');
                    return;
                }

                const response = await axios.get(`http://localhost:5000/api/video/${videoId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                setVideoData(response.data);
                if (response.data.scripts && response.data.scripts[0] && response.data.scripts[0].texts) {
                    setCurrentScript(response.data.scripts[0].texts.map((text, index) => ({
                        id: index + 1,
                        text,
                        media: null
                    })));
                }
                
                console.log('Full response data:', response.data);
                
                if (Array.isArray(response.data.mediaFiles)) {
                    console.log('Fetched media files:', response.data.mediaFiles);
                    setCurrentMediaFiles(response.data.mediaFiles);
                } else {
                    console.log('No media files found or invalid format');
                    setCurrentMediaFiles([]);
                }
            } catch (error) {
                console.error('Error fetching video data:', error);
                setError(error.message || 'Failed to load video data');
            }
        };

        fetchVideoData();
    }, [videoId, token]);

    const handleRemoveMediaFile = (index) => {
        setCurrentMediaFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };

    const getFileExtension = (filename) => {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    };

    const isImageFile = (filename) => {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
        return imageExtensions.includes(getFileExtension(filename));
    };

    const isVideoFile = (filename) => {
        const videoExtensions = ['mp4', 'webm', 'ogg'];
        return videoExtensions.includes(getFileExtension(filename));
    };

    const MediaPreview = ({ file }) => {
        const [isLoading, setIsLoading] = useState(true);
        const [error, setError] = useState(null);
        const filename = file?.path?.split('\\').pop().split('/').pop() || 'Unknown';
        //const filename = file.path.split('\\').pop().split('/').pop();
        const mediaUrl = `http://localhost:5000/api/video/media/${videoId}/${encodeURIComponent(filename)}?token=${token}`;

        const handleLoadStart = () => setIsLoading(true);
        const handleLoadedData = () => setIsLoading(false);
        const handleError = (e) => {
            console.error('Error loading media:', e);
            setError('Failed to load media');
            setIsLoading(false);
        };

        if (isVideoFile(file?.path || '')) {
            return (
                <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
                    {isLoading && <div className="absolute inset-0 flex items-center justify-center">Loading...</div>}
                    {error && <div className="absolute inset-0 flex items-center justify-center text-red-500">{error}</div>}
                    <ReactPlayer
                        url={mediaUrl}
                        width="100%"
                        height="100%"
                        controls
                        file="video/mp4"
                        config={{
                            file: {
                                forceVideo: true,
                                attributes: { crossOrigin: "anonymous" }
                            }
                        }}
                        onLoadStart={handleLoadStart}
                        onLoadedData={handleLoadedData}
                        onError={handleError}
                    />
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                        {file.duration.toFixed(2)}s
                    </div>
                </div>
            );
        } else if (isImageFile(file.path)) {
            return (
                <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                        src={mediaUrl}
                        alt="Media preview" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                        {file.duration.toFixed(2)}s
                    </div>
                </div>
            );
        } else {
            return <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">Unsupported file type</div>;
        }
    };

    const handleUpdate = async (newScript, newMediaFiles) => {
        try {
            const response = await axios.put(`http://localhost:5000/api/video/${videoId}`, 
                { script: newScript.map(s => s.text), mediaFiles: newMediaFiles },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setCurrentScript(newScript);
            setCurrentMediaFiles(newMediaFiles);
            setVideoData(response.data);
        } catch (error) {
            console.error('Error updating video:', error);
            setError(error.message || 'Failed to update video');
        }
    };

    if (error) return <div className="text-red-500">{error}</div>;
    if (!video) return <div>Loading...</div>;

    return (
        <div className="flex justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-4xl">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold mb-4">Title: {video.title}</h1>
                    <ReactPlayer 
                        url={`http://localhost:5000/api/video/${videoId}/stream?token=${token}`}
                        controls 
                        width="100%"
                        height="auto"
                        config={{
                            file: {
                                forceVideo: true,
                                attributes: { crossOrigin: "anonymous" }
                            }
                        }}
                    />
                    <Dialog.Root>
                        <Dialog.Trigger asChild>
                            <button className="bg-blue-500 text-white hover:bg-blue-600 py-2 px-4 rounded-lg mt-4">
                                Edit Video
                            </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                            <Dialog.Overlay className="bg-black bg-opacity-50 fixed inset-0" />
                            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
                                <VisuallyHidden>
                                    <Dialog.Title>Edit Video</Dialog.Title>
                                </VisuallyHidden>
                                <Tabs.Root className="flex flex-col h-full" defaultValue="media">
                                    <Tabs.List className="flex shrink-0 bg-gray-100 border-b">
                                        <Tabs.Trigger className="px-4 py-2 flex-1 text-center hover:bg-gray-200 focus:outline-none" value="script">
                                            Edit script
                                        </Tabs.Trigger>
                                        <Tabs.Trigger className="px-4 py-2 flex-1 text-center hover:bg-gray-200 focus:outline-none" value="media">
                                            Edit media
                                        </Tabs.Trigger>
                                    </Tabs.List>
                                    <Tabs.Content className="flex-grow p-4 overflow-auto" value="script">
                                        <div className="space-y-4">
                                            {currentScript.map((item, index) => (
                                                <div key={item.id} className="flex items-start space-x-4">
                                                    <div className="font-bold w-8">{item.id}</div>
                                                    <div className="flex-grow">
                                                        <textarea
                                                            value={item.text}
                                                            onChange={(e) => {
                                                                const newScript = [...currentScript];
                                                                newScript[index].text = e.target.value;
                                                                setCurrentScript(newScript);
                                                            }}
                                                            className="w-full p-2 border rounded resize-none"
                                                            rows="1"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Tabs.Content>
                                    <Tabs.Content className="flex-grow p-4 overflow-auto" value="media">
                                        <div className="grid grid-cols-4 gap-4">
                                            {currentMediaFiles.length > 0 ? (
                                                currentMediaFiles.map((file, index) => (
                                                    <div key={index} className="relative aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                                                        <MediaPreview file={file} />
                                                        <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                                                        {(file?.filename || 'Unknown').split('.').pop().toUpperCase()}
                                                        </div>
                                                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                                            <button className="bg-white text-black rounded-full p-1">
                                                                <Play size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveMediaFile(index)}
                                                                className="text-white bg-red-500 hover:bg-red-600 rounded px-2 py-1 text-xs"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-4 text-center text-gray-500">
                                                    No media files available
                                                </div>
                                            )}
                                           
                                        </div>
                                        <div className="aspect-w-16 aspect-h-9 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                                                <button className="text-blue-500 hover:text-blue-700">
                                                    + Add Media
                                                </button>
                                        </div>
                                    </Tabs.Content>
                                </Tabs.Root>
                                <div className="flex justify-end space-x-4 p-4 bg-gray-100 border-t">
                                    <Dialog.Close asChild>
                                        <button className="bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400">
                                            Cancel
                                        </button>
                                    </Dialog.Close>
                                    <Dialog.Close asChild>
                                        <button
                                            onClick={() => handleUpdate(currentScript, currentMediaFiles)}
                                            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                                        >
                                            Save Changes
                                        </button>
                                    </Dialog.Close>
                                </div>
                                <Dialog.Close asChild>
                                    <button
                                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                                        aria-label="Close"
                                    >
                                        <X size={24} />
                                    </button>
                                </Dialog.Close>                              
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>
                </div>
            </div>
        </div>
    );
};

export default VideoEditor;