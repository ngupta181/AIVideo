import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import VideoCreation from './pages/VideoCreation';
import VideoEditor from './components/VideoEditor';
import Sidebar from './components/Sidebar';
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
                // Add a function to verify the token
                const isValid = await verifyToken(token);
                if (isValid) {
                    setIsAuthenticated(true);
                } else {
                    handleLogout();
                }
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
        return <div>Loading...</div>;
    }

    return (
        <div className="app-container">
            {isAuthenticated && <Sidebar />}
            <main className="main-content">
                <Routes>
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login onLogin={handleLogin} />} />
                    {isAuthenticated ? (
                        <>
                            <Route path="/home" element={<Home />} />
                            <Route path="/create-video" element={<VideoCreation />} />
                            <Route path="/VideoEditor/:videoId" element={<VideoEditor />} />
                            <Route path="*" element={<Navigate to="/home" />} />
                        </>
                    ) : (
                        <Route path="*" element={<Navigate to="/login" />} />
                    )}
                </Routes>
            </main>
        </div>
    );
}

export default App;