import React, { useEffect, useState } from 'react';
import { CSSTransition } from 'react-transition-group';
import { ArrowLeft, X, Info } from 'react-feather';

// Composant de la modal d'image avec détails
const ImageModal = ({ isOpen, image, onClose, loadImageToCanvas }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedImage, setEditedImage] = useState({ ...image });
    const [imageCanvas, setImageCanvas] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(1); // 1 représente le niveau de zoom normal.
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);

    
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);

    const handleMouseDown = (event) => {
        if (zoomLevel <= 1) return;  // Ajoutez cette condition
        setIsDragging(true);
        setStartX(event.clientX - offsetX);
        setStartY(event.clientY - offsetY);
    };

    const handleMouseMove = (event) => {
        if (!isDragging || zoomLevel <= 1) return;  // Ajoutez la condition de zoom ici aussi
        const x = event.clientX - startX;
        const y = event.clientY - startY;
        setOffsetX(x);
        setOffsetY(y);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };


    const zoomAndOffsetStyle = {
        transform: `scale(${zoomLevel}) translate(${offsetX}px, ${offsetY}px)`,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: (zoomLevel === 1 && offsetX === 0 && offsetY === 0) ? 'transform 0.1s ease-out' : 'none',
    };

    const handleWheel = (event) => {
        if (event.deltaY < 0) {
            setZoomLevel(prevZoom => Math.min(prevZoom + 0.1, 100));
        } else {
            setZoomLevel(prevZoom => {
                if (prevZoom - 0.1 <= 1) {
                    setOffsetX(0);
                    setOffsetY(0);
                    return 1;
                }
                return prevZoom - 0.1;
            });
        }
    };


    useEffect(() => {
        if (image && image.path && image.path.endsWith('.tif')) {
            loadImageToCanvas(image.path, image, (canvas) => {
                setImageCanvas(canvas);
            });
        } else {
            setImageCanvas(null);
        }
    }, [image]);


    const handleChange = (field, value) => {
        setEditedImage(prev => ({ ...prev, [field]: value }));
    };

    const saveChanges = () => {
        electron.ipcRenderer.send('update-image-info', editedImage);
        setIsEditing(false);
    };


    const handleExited = () => {
        setZoomLevel(1);
        setOffsetX(0);
        setOffsetY(0);
    };



    return (
        <CSSTransition in={isOpen} timeout={300} classNames="modal" unmountOnExit onExited={handleExited}>
            <div className="image-modal">
                <div className="modal-content">
                    <div className={`image-section ${showDetails ? 'shrink' : ''}`}>
                    <button className="close-button" onClick={onClose}><ArrowLeft strokeWidth={1.5} ></ArrowLeft></button>

                        {imageCanvas
                            ? <img src={imageCanvas.toDataURL()} alt={image.name} className="selected-image" style={zoomAndOffsetStyle} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
                            : <img src={image.path} alt={image.name} className="selected-image" style={zoomAndOffsetStyle} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
                        }

                        <button className="button-close-detail" onClick={() => setShowDetails(!showDetails)}>
                            {showDetails ? <X strokeWidth={1.5}  ></X> : <Info strokeWidth={1.5} ></Info>}
                        </button>
                    </div>

                    {showDetails && (
                        <div className="details-section">
                            <h1>Info</h1>
                            <h3>Titre</h3>
                            <p>{image.name}</p>
                            <h4>Informations d’observation</h4>
                            <label>Objet : </label>
                            {isEditing ? (
                                <input value={editedImage.skyObject} onChange={e => handleChange('skyObject', e.target.value)} />
                            ) : (
                                <p>{image.skyObject}</p>
                            )}
                            {!isEditing && <button onClick={() => setIsEditing(true)}>Modifier</button>}

                            {isEditing && <button onClick={saveChanges}>Sauvegarder</button>}

                            <p>Type : {image.objectType}</p>
                            <p>Constellation : {image.constellation}</p>
                            <p>AD : {image.AD}</p>
                            <p>DEC : {image.DEC}</p>
                            <p>Date : {image.date}</p>
                            <p>lieu d'acquisition : {image.location}</p>

                            <h4>Caractéristiques de la photo</h4>
                            <p>Type de photo : {image.photoType}</p>
                            <p>Résolution : {image.resolution}</p>
                            <p>Taille : {image.size}</p>
                            <p>Instrument de prise de vue :  {image.instrument}</p>
                            <p>Tube optique :  {image.opticalTube}</p>
                            <p>Monture :  {image.mount}</p>
                            <p>Caméra :  {image.camera}</p>
                            <p>Exposition :  {image.exposition}</p>
                        </div>
                    )}
                </div>
            </div>
        </CSSTransition>
    );
};


export default ImageModal;