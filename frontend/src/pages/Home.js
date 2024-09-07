import React, { useEffect, useState } from 'react';
import { Loader, AlertTriangle } from 'lucide-react';

// Custom Alert component
const Alert = ({ children, variant = 'default' }) => {
  const bgColor = variant === 'destructive' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-blue-100 border-blue-400 text-blue-700';
  return (
    <div className={`border-l-4 p-4 mb-2 ${bgColor}`} role="alert">
      <div className="flex items-center">
        <AlertTriangle className="mr-2" size={18} />
        {children}
      </div>
    </div>
  );
};

const Home = ({ onLogout }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/video/all-videos', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }
        const data = await response.json();
        if (data && data.videos) {
          setVideos(data.videos);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-0">Video History</h1>
      </header>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loader className="animate-spin" size={48} />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </Alert>
      )}

      {!loading && !error && videos.length === 0 && (
        <Alert>
          <p className="font-bold">No videos found</p>
          <p>Your video history is empty.</p>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {videos.map((video, index) => (
          <div key={index} className="bg-gray-700 rounded-lg shadow-md overflow-hidden">
           
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2 truncate text-white">{video.title}</h3>
              <p className="text-sm text-gray-400">
                {new Date(video.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;