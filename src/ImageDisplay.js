import React, { useEffect, useRef, useState } from 'react';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';


const ImageDisplay = ({ viewMode, sortedImages, groupBy, getGroupKey, handleImageClick, isSelected, formatDate }) => {


    const [convertedImages, setConvertedImages] = useState({});
    const [loadingImages, setLoadingImages] = useState({});
    const [selectedImage, setSelectedImage] = useState(null);
    const [showNotification, setShowNotification] = useState(false);

    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [imageLimit, setImageLimit] = useState(100); // Limite initiale de 50 images


    const minScale = 0.5; // Valeur minimale de zoom
    const maxScale = 10;   // Valeur maximale de zoom


    const convertImage = (imagePath) => {
        if (!convertedImages[imagePath]) {
            setLoadingImages(prev => ({ ...prev, [imagePath]: true }));
            if (imagePath.endsWith('.tif')) {
                window.electron.ipcRenderer.send('convert-tif', imagePath);
            } else {
                window.electron.ipcRenderer.send('convert-fit', imagePath);
            }
        }
    };

    // Fonction pour charger plus d'images
    const loadMoreImages = () => {
        setImageLimit(prevLimit => prevLimit + 50); // Augmente la limite de 50
    };

    // Modifier la logique de rendu pour afficher un nombre limité d'images
    const limitedSortedImages = () => {
        const allImages = sortedImages();
        return allImages.slice(0, imageLimit); // Affiche uniquement un nombre limité d'images
    };



    useEffect(() => {
        // Obtenez les images limitées
        const limitedImages = limitedSortedImages();

        limitedImages.forEach(image => {
            if (image.convertPath) {
                // Utilisez convertPath si disponible
                setConvertedImages(prev => ({ ...prev, [image.path]: image.convertPath }));
            } else if (!convertedImages[image.path]) {
                // Vérifiez l'extension du fichier et déclenchez la conversion si nécessaire
                if (image.path.endsWith('.fit') || image.path.endsWith('.fits')) {
                    convertImage(image.path, 'fit');
                } else if (image.path.endsWith('.tif')) {
                    convertImage(image.path, 'tif');
                }
            }
        });


        const conversionListener = (event, { imagePath, convertedPath }) => {
            console.log("Conversion terminée:", imagePath, convertedPath);
            setConvertedImages(prev => ({ ...prev, [imagePath]: convertedPath }));
            setLoadingImages(prev => ({ ...prev, [imagePath]: false })); // Mettre à jour l'état de chargement
        };

        window.electron.ipcRenderer.on('conversion-done', conversionListener);

        return () => {
            window.electron.ipcRenderer.off('conversion-done', conversionListener);
        };
    }, [sortedImages, imageLimit]); // Ajoutez imageLimit comme dépendance



    // Charger les images FITS
    const getImageSrc = (image) => {
        return convertedImages[image.path] || image.path;
    };

    const DateEnLettres = ({ dateKey }) => {
        if (!dateKey) {
            return <h2>Chargement de la date...</h2>;
        }

        const dateParts = dateKey.split('/');
        const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
        const dateFormatee = format(date, 'dd MMMM yyyy', { locale: fr });

        return <h2>{dateFormatee}</h2>;
    };



    const handleImageDoubleClick = (image) => {
        if (image.path.endsWith('.fit') || image.path.endsWith('.fits')) {
            window.electron.ipcRenderer.send('open-fit-file', image.path);
            setShowNotification(true);  // Activer la notification
            setTimeout(() => setShowNotification(false), 3000);  // Désactiver après 3 secondes

            console.log(image.path)
        } else {
            window.electron.ipcRenderer.send('open-default-app', image.path);
        }
    };


    const notificationStyle = {
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'var(--bg-color)',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 0 5px rgba(0, 0, 0, 0.2)'
    };


    const renderImage = (image) => {
        const isImageLoading = loadingImages[image.path];


        return isImageLoading ? (
            <div className="skeleton"></div>
        ) : (
            <img
                loading='lazy'
                onClick={(e) => handleImageClick(image, e)}
                onDoubleClick={() => handleImageDoubleClick(image)}
                key={image.id}
                src={getImageSrc(image)}
                alt={`Image de ${image.name}`}
                className={isSelected(image) ? 'focus-image' : ''}
                style={{ width: 'auto', height: '100px' }}
            />
        );
    };




    const handleWheel = (e) => {
        const zoomFactor = 0.1;
        let newScale = scale;

        if (e.deltaY < 0) {
            newScale = Math.min(scale + zoomFactor, maxScale); // Zoom in
        } else {
            newScale = Math.max(scale - zoomFactor, minScale); // Zoom out
        }

        setScale(newScale);
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
        setIsDragging(true);
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            const newX = e.clientX - startPos.x;
            const newY = e.clientY - startPos.y;
            setPosition({ x: newX, y: newY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const containerRef = useRef(null); // Référence au conteneur

    const handleScroll = () => {
        const container = containerRef.current;
        if (container) {
            // Vérifier si l'utilisateur a atteint le bas du conteneur
            if (container.scrollHeight - container.scrollTop === container.clientHeight) {
                console.log("At bottom of container");
                loadMoreImages();
            }
        }
    };

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [imageLimit]); // Ajoutez les dépendances nécessaires



    return (
        <div className="container" ref={containerRef}>
            {viewMode === 'grid' ? (
                Object.entries(groupBy(limitedSortedImages(), getGroupKey)).map(([key, imgs]) => (
                    <div key={key}>

                        <DateEnLettres dateKey={key} />

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'left' }}>
                            {imgs.map(image => (
                                <>
                                    {/*<img src={image?.path} alt={image?.name} onClick={(e) => handleImageClick(image, e)} className={isSelected(image) ? 'focus-image' : ''} style={{ height: "100px", width: 'auto' }} />*/}
                                    {renderImage(image)}
                                </>

                            ))}
                        </div>


                    </div>
                ))
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Nom</th>
                            <th>Type</th>
                            <th>Date</th>
                            <th>Objet</th>
                            <th>Lieu</th>
                            <th>Constellation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {limitedSortedImages().map(image => (
                            <tr onClick={(e) => handleImageClick(image, e)}
                                key={image.id}
                            >
                                <td className={isSelected(image) ? 'focus' : ''}  >

                                    <img
                                        key={image.id}
                                        src={getImageSrc(image)}
                                        alt={image.name}
                                        style={{ height: "30px", width: 'auto' }}
                                    />

                                </td>
                                <td className={isSelected(image) ? 'focus' : ''} >{image.name}</td>
                                <td className={isSelected(image) ? 'focus' : ''} >{image.photoType}</td>
                                <td className={isSelected(image) ? 'focus' : ''} style={{ whiteSpace: 'nowrap' }}>{formatDate(image.date)}</td>
                                <td className={isSelected(image) ? 'focus' : ''}>{image.skyObject}</td>
                                <td className={isSelected(image) ? 'focus' : ''} >{image.location}</td>
                                <td className={isSelected(image) ? 'focus' : ''} >{image.constellation}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}



            {/*}
            {selectedImage && (
                <div
                    className="fullscreen-image-container"

                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                >
                    <img
                        src={getImageSrc(selectedImage)}
                        alt={`Image agrandie`}
                        className="fullscreen-image"
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        style={{
                            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                            cursor: isDragging ? 'grabbing' : 'grab',
                            transition: 'none'  // Supprime l'effet de lissage
                        }}
                    />
                </div>
            )}
            */}



            {showNotification && (
                <div style={notificationStyle}>
                    <p>Ouverture de l'image .fit dans une fenêtre séparée.</p>
                </div>
            )}


            {imageLimit < sortedImages().length && (
                <div style={{ height: '20px' }}>
                    <p>Chargement...</p>
                </div>
            )}
        </div>
    );

}

export default ImageDisplay;
