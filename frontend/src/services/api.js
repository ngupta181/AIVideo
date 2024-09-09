import axios from 'axios';
import { API_URL } from '../config';

export const register = async (userData) => {
    return await axios.post(`${API_URL}/auth/register`, userData);
};

export const login = async (userData) => {
    return await axios.post(`${API_URL}/auth/login`, userData);
};
