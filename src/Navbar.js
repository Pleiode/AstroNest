import React from 'react';

function Navbar() {
  return (
    <nav className="navbar">
    
      <ul className="navbar-links">
        <li><a href="/">Mes photos</a></li>
        <li><a href="/apropos">Explorer</a></li>
        <li><a href="/services">Corbeille</a></li>
      </ul>
    </nav>
  );
}

export default Navbar;
