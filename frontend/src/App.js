import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import VideoCreation from './pages/VideoCreation';
import VideoEditor from './components/VideoEditor';
import Sidebar from './components/Sidebar';
import Settings from './pages/Settings';
import './App.css';


async function verifyToken(token) {
  try {
    const response = await fetch('/api/verify-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const isValid = await verifyToken(token);
                    setIsAuthenticated(isValid);
                } catch (error) {
                    console.error('Token verification failed:', error);
                    setIsAuthenticated(false);
                }
            } else {
                setIsAuthenticated(false);
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    const handleLogin = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
    };

    if (isLoading) {
         return <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-800">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>;
    }

    return (
        <ThemeProvider>
            <div className="app-container dark:bg-background-dark dark:text-text-dark transition-colors duration-200">
                {isAuthenticated && <Sidebar onLogout={handleLogout} />}
                <main className="main-content">
                    <Routes>
                        <Route path="/register" element={<Register />} />
                        <Route path="/login" element={<Login onLogin={handleLogin} />} />
                        {isAuthenticated ? (
                            <>
                                <Route path="/home" element={<Home />} />
                                <Route path="/create-video" element={<VideoCreation />} />
                                <Route path="/VideoEditor/:videoId" element={<VideoEditor />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="*" element={<Navigate to="/home" />} />
                            </>
                        ) : (
                            <Route path="*" element={<Navigate to="/login" />} />
                        )}
                    </Routes>
                </main>
            </div>
        </ThemeProvider>
    );
}

export default App;