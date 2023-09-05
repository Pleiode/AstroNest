import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import ImageDisplay from './ImageDisplay';
import Navbar from './Navbar';





class App extends React.Component {

  
  render() {
    return (
      <div style={{ display: 'flex' }}>
        <Router>
          <Navbar />
          <Routes>
            <Route index path="/" element={<Navigate to="/pictures" />} />

            <Route index path="/pictures" element={<ImageDisplay />} />
            
            <Route  index path="/trash"  element={<ImageDisplay />} />

       
          </Routes>

        </Router>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('app'));
root.render(<App />);
