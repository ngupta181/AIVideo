import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ onLogout }) => {
  return (
    <aside className="sidebar">
      <div className="logo">Logo</div>
      <nav>
        <ul>
          <li><Link to="/home"><i className="icon-home"></i> Home</Link></li>
          <li><Link to="/create-video"><i className="icon-video"></i> Create Video</Link></li>
        </ul>
      </nav>
      <div className="user-info">
        <div className="avatar">N</div>
        <div className="user-details">
          <div>Nick Gupta</div>
          <div className="email">nick@gmail.com</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
