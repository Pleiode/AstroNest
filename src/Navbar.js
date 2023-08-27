import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Image as ImageIcon, Trash as TrashIcon } from 'react-feather';

function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="navbar">
      <ul className="navbar-links">
        <li>
          <Link to="/pictures" className={`nav-link ${pathname === "/pictures" ? 'active' : ''}`}>
            <ImageIcon className='navbar-icon' />
            Mes photos
          </Link>
        </li>
        <li>
          <Link to="/trash" className={`nav-link ${pathname === "/trash" ? 'active' : ''}`}>
            <TrashIcon className='navbar-icon' />
            Corbeille
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
