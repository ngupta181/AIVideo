import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import './Login.css';

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const userData = { email, password };
        try {
            const response = await login(userData);
            localStorage.setItem('token', response.data.token);
            onLogin();
            navigate('/home');
        } catch (error) {
            console.error('Login error:', error);
            setError('Invalid email or password. Please try again.');
        }
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <div className="logo">Reels</div>
                <h1>Welcome Back!</h1>
                <p className="subtitle">Login to Reels</p>
                <button className="google-login">
                    <img src="/google-icon.png" alt="Google" /> Google
                </button>
                <div className="divider">OR</div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="login-button">Log In</button>
                </form>
                <p className="signup-link">
                    Don't have an account? <Link to="/register">Sign Up</Link>
                </p>
                <p className="forgot-password">
                    <Link to="/forgot-password">Forgot Password? Reset Password</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
