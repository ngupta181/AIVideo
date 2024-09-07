import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Home, Video, Sun, Moon, Menu, X, Settings, LogOut } from 'lucide-react';
import { ThemeContext } from '../contexts/ThemeContext';

const Sidebar = ({ onLogout }) => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      <button onClick={toggleSidebar} className="lg:hidden fixed top-4 left-4 z-20 p-2 bg-white dark:bg-gray-800 rounded-md shadow-md">
        <Menu size={24} />
      </button>
      <aside className={`fixed inset-y-0 left-0 z-10 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <div className="text-xl font-bold">Logo</div>
            <button onClick={toggleSidebar} className="lg:hidden">
              <X size={24} />
            </button>
          </div>
          <nav className="flex-grow py-4">
            <ul className="space-y-2">
              <li>
                <Link to="/home" onClick={() => setIsOpen(false)} className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Home size={18} className="mr-3" /> Home
                </Link>
              </li>
              <li>
                <Link to="/create-video" onClick={() => setIsOpen(false)} className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Video size={18} className="mr-3" /> Create Video
                </Link>
              </li>
              <li>
                <Link to="/settings" onClick={() => setIsOpen(false)} className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Settings size={18} className="mr-3" /> Settings
                </Link>
              </li>
            </ul>
          </nav>
          <div className="p-4 border-t dark:border-gray-700">
            <button onClick={toggleTheme} className="flex items-center w-full px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              {isDarkMode ? <Sun size={18} className="mr-3" /> : <Moon size={18} className="mr-3" />}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div className="flex items-center mt-4 space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                N
              </div>
              <div className="flex-grow">
                <div className="font-medium">Nick Gupta</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">nick@gmail.com</div>
              </div>
            </div>
            <button onClick={onLogout} className="flex items-center w-full px-4 py-2 mt-4 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-md">
              <LogOut size={18} className="mr-3" /> Log out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
