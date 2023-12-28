import React, { useState, useEffect } from 'react';
import { X } from 'react-feather';

const FullScreenImage = ({ imagePath, onClose }) => {
    const [scale, setScale] = useState(0.8);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [imageWidth, setImageWidth] = useState(0);
    const [imageHeight, setImageHeight] = useState(0);

    useEffect(() => {
        const img = new Image();
        img.src = imagePath;
        img.onload = () => {
            setImageWidth(img.width);
            setImageHeight(img.height);
        };
    }, [imagePath]);

    const handleWheel = (e) => {
        e.preventDefault();
        const newScale = Math.min(3, Math.max(0.5, scale + e.deltaY * -0.01));
        setScale(newScale);
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        let startPos = { x: e.clientX, y: e.clientY };

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - startPos.x;
            const deltaY = e.clientY - startPos.y;

            setPosition(prevPosition => {
                const newX = prevPosition.x + deltaX;
                const newY = prevPosition.y + deltaY;

                return { x: newX, y: newY };
            });

            startPos = { x: e.clientX, y: e.clientY };
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp, { once: true });
    };

    useEffect(() => {
        setPosition({ x: 0, y: 0 });
    }, [imagePath]);

    return (
        <div className="fullscreen-image-container">
            <div
                className="close-button"
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    cursor: 'pointer',
                }}
            >
                <X size={24} />
            </div>
            <div
                className="image-container"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    imageRendering: 'pixelated',
                }}
            >
                <img src={imagePath} alt="Agrandissement" />
            </div>
        </div>
    );
};

export default FullScreenImage;
