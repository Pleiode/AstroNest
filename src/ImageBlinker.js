import React, { useState, useEffect } from 'react';

function ImageBlinker({ imagePaths }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndex(prevIndex => 
        prevIndex + 1 === imagePaths.length ? 0 : prevIndex + 1
      );
    }, 1000); // Change l'image toutes les secondes

    return () => clearInterval(intervalId);
  }, [imagePaths.length]);

  return (
    <div>
      {imagePaths.length > 0 && (
        <img src={imagePaths[currentImageIndex]} alt="Blinking Image" />
      )}
    </div>
  );
}

export default ImageBlinker;