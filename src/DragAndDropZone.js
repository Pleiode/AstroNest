// DragAndDropZone.js
import React from 'react';

const DragAndDropZone = ({ onDrop, children }) => {
    const preventDrag = e => {
        e.preventDefault();
    };

    return (
        <div
            onDrop={onDrop}
            onDragOver={preventDrag}
            onDragEnter={preventDrag}
            style={{ width: '100%', height: '100%', position: 'relative' }}
        >
            {children}
        </div>
    );
}

export default DragAndDropZone;
