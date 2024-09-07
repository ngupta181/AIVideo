import React, { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const Settings = () => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);

  return (
    <div className="bg-white dark:bg-gray-800 min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Settings</h1>
      
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">Personal Information</h2>
        
        <div className="flex items-center mb-6">
          <div className="w-20 h-20 bg-teal-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            N
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Name</label>
          <p className="text-gray-600 dark:text-gray-400">Nick</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email Address</label>
          <p className="text-gray-600 dark:text-gray-400">nic@gmail.com</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Login Provider</label>
          <p className="text-gray-600 dark:text-gray-400">Google</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Theme</label>
          <button
            onClick={toggleTheme}
            className="bg-gray-200 dark:bg-gray-600 p-2 rounded-md text-gray-700 dark:text-gray-300"
          >
            {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
