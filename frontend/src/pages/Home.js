import React, { useEffect, useState } from 'react';
import { Loader, FolderPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_URL } from '../config';


const ProjectCard = ({ video }) => (
  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
    <img src={video.thumbnail || 'https://via.placeholder.com/300x200'} alt={video.title} className="w-full h-48 object-cover" />
    <div className="p-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{video.title}</h3>
      <div className="flex justify-between items-center">
        <div>
          <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-sm mr-2">Video</span>
          <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm">{video.status || 'DRAFT'}</span>
        </div>
        <span className="text-gray-600 dark:text-gray-400 text-sm">{new Date(video.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  </div>
);

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage] = useState(8); // Adjust this number as needed

  

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/video/all-videos`, {
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

  const filteredVideos = videos.filter(video => {
    if (activeTab === 'all') return true;
    if (activeTab === 'failed') return video.status === 'failed';
    if (activeTab === 'completed') return video.status === 'completed';
    return false;
  });

  // Get current videos
  const indexOfLastVideo = currentPage * videosPerPage;
  const indexOfFirstVideo = indexOfLastVideo - videosPerPage;
  const currentVideos = filteredVideos.slice(indexOfFirstVideo, indexOfLastVideo);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(filteredVideos.length / videosPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="bg-white dark:bg-gray-800 min-h-screen p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Projects</h1>
        <div>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg mr-2 flex items-center hover:bg-blue-600">
            <FolderPlus size={18} className="mr-2" /> New Project
          </button>
        </div>
      </div>

      <div className="mb-6">
        <button 
          className={`mr-4 font-semibold ${activeTab === 'all' ? 'text-blue-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('all')}
        >
          All ({videos.length})
        </button>
        <button 
          className={`mr-4 font-semibold ${activeTab === 'failed' ? 'text-blue-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('failed')}
        >
          Failed ({videos.filter(v => v.status === 'failed').length})
        </button>
        <button 
          className={`mr-4 font-semibold ${activeTab === 'completed' ? 'text-blue-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({videos.filter(v => v.status === 'completed').length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader className="animate-spin text-blue-500" size={48} />
        </div>
      ) : error ? (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentVideos.map((video, index) => (
              <ProjectCard key={index} video={video} />
            ))}
          </div>
          
          {filteredVideos.length > videosPerPage && (
            <div className="flex justify-center mt-8">
              <nav className="flex items-center">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="mx-1 px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>
                {pageNumbers.map(number => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`mx-1 px-3 py-1 rounded ${
                      currentPage === number
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === Math.ceil(filteredVideos.length / videosPerPage)}
                  className="mx-1 px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  <ChevronRight size={20} />
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home;