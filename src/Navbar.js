import React from "react";
import { Link, useLocation } from 'react-router-dom';
import { Image as ImageIcon, Upload } from 'react-feather';



const exportDatabase = () => {
  // Envoie un événement pour demander l'exportation
  window.electron.ipcRenderer.send("export-db-to-json");

  // Écoute de la réponse
  window.electron.ipcRenderer.on("export-db-to-json-reply", (event, data) => {
    if (data.success) {
      alert("Base de données exportée avec succès !");
    } else {
      alert("Erreur lors de l'exportation de la base de données:" + data.error.message);
    }
  });
};


function Navbar() {
  const { pathname } = useLocation();


  return (
    <nav className="navbar">
      <div>
        <ul className="navbar-links">
          <li>
            <Link to="/" className={`nav-link ${pathname === "/" ? 'active' : ''}`}>
              <ImageIcon className='navbar-icon' />
              Photos
            </Link>
          </li>

          {/*
          <li>
            <Link to="/trash" className={`nav-link ${pathname === "/trash" ? 'active' : ''}`}>
              <TrashIcon className='navbar-icon' />
              Corbeille
            </Link>
  </li> */}
        </ul>

      </div>

      <div>

        <button className="btn-export" onClick={exportDatabase}>
          <Upload strokeWidth={2} width={'16px'} />
          Exporter base de donnée
        </button>
      </div>


    </nav>
  );
}

export default Navbar;
