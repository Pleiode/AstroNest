import React, { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Notification from './notification';
import Table from './Table'
import FullScreenImage from './FullScreenImage';

const ImageDisplay = ({ viewMode, sortedImages, groupBy, getGroupKey, handleImageClick, isSelected, formatDate, setSelectedImages, imageSize, width, selectedImages, handleInputChange }) => {


    const [convertedImages, setConvertedImages] = useState({});
    const [loadingImages, setLoadingImages] = useState({});
    const [showNotification, setShowNotification] = useState(false);
    const [selectedImagePath, setSelectedImagePath] = useState(null);

    const [imageLimit, setImageLimit] = useState(100);



    const LoadingSpinner = () => {
        return (
            <svg className="spinner" viewBox="0 0 50 50">
                <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
            </svg>
        );
    };



    const convertImage = useCallback((imagePath) => {
        if (!convertedImages[imagePath]) {
            setLoadingImages(prev => ({ ...prev, [imagePath]: true }));
            if (imagePath.endsWith('.cr2') || imagePath.endsWith('.nef') || imagePath.endsWith('.arw')) {
                window.electron.ipcRenderer.send('convert-raw', imagePath);
            } else if (imagePath.endsWith('.tif')) {
                window.electron.ipcRenderer.send('convert', imagePath);
                // Gère les formats PNG, JPG, JPEG
            } else {
                window.electron.ipcRenderer.send('convert', imagePath);
            }
        }
    }, [convertedImages]);


    // Charger les images FITS
    const getImageSrc = useCallback((image) => {
        return convertedImages[image.path] || image.path;
    }, [convertedImages]);


    const loadMoreImages = useCallback(() => {
        setImageLimit(prevLimit => prevLimit + 50);
    }, []);


    // Modifier la logique de rendu pour afficher un nombre limité d'images
    const limitedSortedImages = useCallback(() => {
        return sortedImages().slice(0, imageLimit);
    }, [sortedImages, imageLimit]);


    useEffect(() => {
        // Obtenez les images limitées
        const limitedImages = limitedSortedImages();

        limitedImages.forEach(image => {
            if (image.thumbnailPath) {
                // Utilisez convertPath si disponible
                setConvertedImages(prev => ({ ...prev, [image.path]: image.thumbnailPath }));
            } else if (!convertedImages[image.path]) {
                // Vérifiez l'extension du fichier et déclenchez la conversion si nécessaire
                if (image.path.endsWith('.fit') || image.path.endsWith('.fits')) {
                    convertImage(image.path, 'fit');
                } else if (image.path.endsWith('.tif') || image.path.endsWith('.tiff')) {
                    convertImage(image.path, 'tif');
                } else if (image.path.endsWith('.cr2') || image.path.endsWith('.arw') /* Ajoutez d'autres extensions RAW si nécessaire */) {
                    convertImage(image.path, 'raw')
                } else if (image.path.endsWith('.jpg') || image.path.endsWith('.jpeg') || image.path.endsWith('.png') || image.path.endsWith('.webp')) {
                    // Ajouter ici le traitement pour JPG, PNG, et WEBP
                    convertImage(image.path, 'jpg'); // Utilisez un argument spécifique pour ces formats

                }
            }
        });


        const conversionListener = (event, { imagePath, convertedPath, thumbnailPath }) => {
            console.log("Conversion terminée:", imagePath, thumbnailPath);
            setConvertedImages(prev => ({ ...prev, [imagePath]: thumbnailPath }));
            setLoadingImages(prev => ({ ...prev, [imagePath]: false })); // Mettre à jour l'état de chargement
        };


        window.electron.ipcRenderer.on('conversion-done', conversionListener);

        return () => {
            window.electron.ipcRenderer.off('conversion-done', conversionListener);
        };
    }, [sortedImages, imageLimit]); // Ajoutez imageLimit comme dépendance





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
        const imagePath = image.path.endsWith('.fit') || image.path.endsWith('.fits') || image.path.endsWith('.tif') || image.path.endsWith('.tiff')
            ? image.convertPath
            : image.path;
        setSelectedImagePath(imagePath);
    };





    const renderImage = useCallback((image) => {
        const isImageLoading = loadingImages[image.path];
        const isSelectedClass = isSelected(image) ? 'selected' : '';

        return isImageLoading ? (
            <div style={{width: `${imageSize}px`, height: imageSize + 'px' }} className="skeleton">
                <LoadingSpinner />
            </div>
        ) : (
            <div className={`image-container ${isSelectedClass}`} onClick={(e) => handleImageClick(image, e)}>
                <img
                    loading='lazy'
                    onDoubleClick={() => handleImageDoubleClick(image)}
                    key={image.id}
                    src={getImageSrc(image)}
                    alt={`Image de ${image.name}`}
                    style={{ width: 'auto', height: imageSize + 'px' }}
                />

                <input
                    type="checkbox"
                    className="image-checkbox round-checkbox"
                    checked={isSelected(image)}
                    onChange={(e) => handleCheckboxChange(image, e)}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        );
    }, [loadingImages, isSelected, handleImageClick, imageSize]); // Ajoutez les dépendances nécessaires



    const handleCheckboxChange = (image, event) => {
        // Gérer le changement de la case à cocher
        setSelectedImages(prevImages => {
            if (event.target.checked) {
                return [...prevImages, image];
            } else {
                return prevImages.filter(selected => selected.id !== image.id);
            }
        });
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


    const widthStr = width + 'px'; // Si width est un nombre



    return (
        <div className="container" ref={containerRef}>

            {selectedImagePath &&
                <FullScreenImage
                    imagePath={selectedImagePath}
                    onClose={() => setSelectedImagePath(null)}
                />
            }



            {limitedSortedImages().length === 0 ? (
                // Afficher cette div si aucune image n'est présente
                <div className="no-images">
                    <svg width="117" height="116" viewBox="0 0 117 116" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M75.8982 0H2.90428C2.26662 0 1.65509 0.253162 1.2042 0.703795C0.753307 1.15443 0.5 1.76562 0.5 2.40291V75.3671C0.5 76.0044 0.753307 76.6156 1.2042 77.0662C1.65509 77.5169 2.26662 77.77 2.90428 77.77H31.2627C31.9004 77.77 32.5119 77.5169 32.9628 77.0662C33.4137 76.6156 33.667 76.0044 33.667 75.3671C33.667 74.7298 33.4137 74.1187 32.9628 73.668C32.5119 73.2174 31.9004 72.9642 31.2627 72.9642H5.3326V4.8779H73.4458V30.7932C73.4458 31.4305 73.6991 32.0417 74.15 32.4923C74.6009 32.943 75.2124 33.1961 75.8501 33.1961C76.4877 33.1961 77.0992 32.943 77.5501 32.4923C78.001 32.0417 78.2543 31.4305 78.2543 30.7932V2.41492C78.2543 1.77763 78.001 1.16644 77.5501 0.715809C77.0992 0.265177 76.4877 0.0120145 75.8501 0.0120145" fill="#959595" />
                        <path d="M114.211 106.832C113.909 106.832 113.609 106.892 113.33 107.008C113.05 107.124 112.797 107.294 112.583 107.508C112.37 107.723 112.201 107.977 112.086 108.257C111.972 108.537 111.914 108.836 111.915 109.139V111.422H109.631C109.052 111.464 108.511 111.723 108.116 112.147C107.721 112.572 107.501 113.13 107.501 113.71C107.501 114.29 107.721 114.849 108.116 115.273C108.511 115.698 109.052 115.957 109.631 115.999H114.211C114.816 115.996 115.395 115.754 115.823 115.327C116.25 114.9 116.492 114.321 116.495 113.716V109.139C116.492 108.534 116.25 107.956 115.823 107.528C115.395 107.101 114.816 106.859 114.211 106.856" fill="#959595" />
                        <path d="M92.8106 111.398H85.2131C84.6344 111.44 84.093 111.699 83.6978 112.123C83.3027 112.548 83.083 113.106 83.083 113.686C83.083 114.266 83.3027 114.825 83.6978 115.249C84.093 115.674 84.6344 115.933 85.2131 115.975H92.8106C93.1253 115.998 93.4413 115.956 93.7389 115.851C94.0365 115.746 94.3094 115.581 94.5404 115.367C94.7714 115.152 94.9557 114.892 95.0817 114.603C95.2077 114.314 95.2727 114.002 95.2727 113.686C95.2727 113.371 95.2077 113.059 95.0817 112.77C94.9557 112.481 94.7714 112.221 94.5404 112.006C94.3094 111.791 94.0365 111.626 93.7389 111.522C93.4413 111.417 93.1253 111.375 92.8106 111.398Z" fill="#959595" />
                        <path d="M68.3965 111.398H60.799C60.4843 111.375 60.1683 111.417 59.8707 111.522C59.5731 111.626 59.3003 111.791 59.0692 112.006C58.8382 112.221 58.6539 112.481 58.5279 112.77C58.4019 113.059 58.3369 113.371 58.3369 113.686C58.3369 114.002 58.4019 114.314 58.5279 114.603C58.6539 114.892 58.8382 115.152 59.0692 115.367C59.3003 115.581 59.5731 115.746 59.8707 115.851C60.1683 115.956 60.4843 115.998 60.799 115.975H68.3965C68.9752 115.933 69.5166 115.674 69.9118 115.249C70.3069 114.825 70.5266 114.266 70.5266 113.686C70.5266 113.106 70.3069 112.548 69.9118 112.123C69.5166 111.699 68.9752 111.44 68.3965 111.398Z" fill="#959595" />
                        <path d="M45.4975 111.398H43.2014V109.14C43.2014 108.534 42.9608 107.954 42.5324 107.526C42.1041 107.097 41.5231 106.857 40.9174 106.857C40.3116 106.857 39.7306 107.097 39.3023 107.526C38.8739 107.954 38.6333 108.534 38.6333 109.14V113.717C38.6365 114.322 38.8781 114.9 39.3058 115.328C39.7334 115.755 40.3126 115.997 40.9174 116H45.4975C46.0762 115.958 46.6176 115.699 47.0127 115.274C47.4079 114.849 47.6276 114.291 47.6276 113.711C47.6276 113.131 47.4079 112.573 47.0127 112.148C46.6176 111.724 46.0762 111.464 45.4975 111.422" fill="#959595" />
                        <path d="M40.9174 70.189C41.5222 70.1858 42.1013 69.9443 42.529 69.5169C42.9566 69.0895 43.1983 68.5107 43.2015 67.9062V60.313C43.2015 59.7076 42.9608 59.127 42.5325 58.6989C42.1041 58.2708 41.5232 58.0303 40.9174 58.0303C40.3116 58.0303 39.7307 58.2708 39.3023 58.6989C38.874 59.127 38.6333 59.7076 38.6333 60.313V67.9062C38.6317 68.2064 38.6897 68.504 38.804 68.7817C38.9182 69.0593 39.0864 69.3116 39.2988 69.5239C39.5112 69.7362 39.7636 69.9043 40.0414 70.0185C40.3193 70.1326 40.617 70.1906 40.9174 70.189Z" fill="#959595" />
                        <path d="M38.6333 92.3206C38.6333 92.926 38.8739 93.5066 39.3023 93.9347C39.7306 94.3628 40.3116 94.6033 40.9174 94.6033C41.5231 94.6033 42.1041 94.3628 42.5324 93.9347C42.9608 93.5066 43.2014 92.926 43.2014 92.3206V84.7154C43.2014 84.11 42.9608 83.5293 42.5324 83.1012C42.1041 82.6731 41.5231 82.4326 40.9174 82.4326C40.3116 82.4326 39.7306 82.6731 39.3023 83.1012C38.8739 83.5293 38.6333 84.11 38.6333 84.7154V92.3206Z" fill="#959595" />
                        <path d="M45.4975 38.1597H40.9174C40.3116 38.1597 39.7306 38.4002 39.3023 38.8283C38.8739 39.2564 38.6333 39.837 38.6333 40.4425V45.008C38.6333 45.6134 38.8739 46.194 39.3023 46.6221C39.7306 47.0502 40.3116 47.2907 40.9174 47.2907C41.5231 47.2907 42.1041 47.0502 42.5324 46.6221C42.9608 46.194 43.2014 45.6134 43.2014 45.008V42.7252H45.4975C46.1023 42.7221 46.6814 42.4805 47.1091 42.0531C47.5368 41.6257 47.7784 41.0469 47.7816 40.4425C47.7832 40.1422 47.7252 39.8447 47.611 39.567C47.4967 39.2893 47.3286 39.037 47.1161 38.8248C46.9037 38.6125 46.6513 38.4444 46.3735 38.3302C46.0956 38.2161 45.7979 38.1581 45.4975 38.1597Z" fill="#959595" />
                        <path d="M68.3957 38.1597H60.7982C60.1924 38.1597 59.6115 38.4002 59.1831 38.8283C58.7548 39.2564 58.5142 39.837 58.5142 40.4425C58.5142 41.0479 58.7548 41.6285 59.1831 42.0566C59.6115 42.4847 60.1924 42.7252 60.7982 42.7252H68.3957C69.0005 42.7221 69.5797 42.4805 70.0073 42.0531C70.435 41.6257 70.6766 41.0469 70.6798 40.4425C70.6814 40.1422 70.6234 39.8447 70.5092 39.567C70.395 39.2893 70.2268 39.037 70.0144 38.8248C69.802 38.6125 69.5495 38.4444 69.2717 38.3302C68.9939 38.2161 68.6961 38.1581 68.3957 38.1597Z" fill="#959595" />
                        <path d="M92.8088 38.1597H85.2113C84.6055 38.1597 84.0246 38.4002 83.5962 38.8283C83.1679 39.2564 82.9272 39.837 82.9272 40.4424C82.9272 41.0479 83.1679 41.6285 83.5962 42.0566C84.0246 42.4847 84.6055 42.7252 85.2113 42.7252H92.8088C93.4146 42.7252 93.9956 42.4847 94.4239 42.0566C94.8522 41.6285 95.0929 41.0479 95.0929 40.4424C95.0929 39.837 94.8522 39.2564 94.4239 38.8283C93.9956 38.4002 93.4146 38.1597 92.8088 38.1597Z" fill="#959595" />
                        <path d="M114.21 38.1597H109.63C109.024 38.1597 108.443 38.4002 108.015 38.8283C107.586 39.2564 107.346 39.837 107.346 40.4424C107.346 41.0479 107.586 41.6285 108.015 42.0566C108.443 42.4847 109.024 42.7252 109.63 42.7252H111.914V45.0079C111.891 45.3225 111.933 45.6383 112.038 45.9357C112.143 46.2332 112.308 46.5059 112.523 46.7368C112.738 46.9677 112.998 47.1518 113.287 47.2777C113.576 47.4037 113.888 47.4687 114.204 47.4687C114.519 47.4687 114.832 47.4037 115.121 47.2777C115.41 47.1518 115.67 46.9677 115.885 46.7368C116.1 46.5059 116.265 46.2332 116.37 45.9357C116.475 45.6383 116.517 45.3225 116.494 45.0079V40.4424C116.491 39.838 116.249 39.2592 115.821 38.8318C115.394 38.4043 114.815 38.1628 114.21 38.1597Z" fill="#959595" />
                        <path d="M114.208 82.3965C113.907 82.3949 113.609 82.4528 113.331 82.5668C113.052 82.6808 112.799 82.8487 112.585 83.0609C112.372 83.273 112.203 83.5252 112.087 83.8029C111.972 84.0807 111.912 84.3785 111.912 84.6793V92.3205C111.889 92.635 111.932 92.9509 112.036 93.2483C112.141 93.5458 112.306 93.8184 112.521 94.0493C112.736 94.2802 112.996 94.4644 113.285 94.5903C113.575 94.7162 113.887 94.7812 114.202 94.7812C114.518 94.7812 114.83 94.7162 115.119 94.5903C115.409 94.4644 115.669 94.2802 115.884 94.0493C116.098 93.8184 116.263 93.5458 116.368 93.2483C116.473 92.9509 116.515 92.635 116.492 92.3205V84.7153C116.492 84.1065 116.253 83.5221 115.826 83.0883C115.398 82.6545 114.817 82.406 114.208 82.3965Z" fill="#959595" />
                        <path d="M114.209 57.9839C113.6 57.9839 113.016 58.2257 112.586 58.656C112.155 59.0864 111.913 59.6701 111.913 60.2787V67.9079C111.955 68.4863 112.215 69.0273 112.639 69.4222C113.064 69.8172 113.623 70.0367 114.203 70.0367C114.783 70.0367 115.342 69.8172 115.767 69.4222C116.192 69.0273 116.451 68.4863 116.493 67.9079V60.3147C116.496 59.7038 116.258 59.1164 115.831 58.6799C115.403 58.2435 114.82 57.9934 114.209 57.9839Z" fill="#959595" />
                        <path d="M97.4524 75.2699C97.4433 75.5893 97.3356 75.8982 97.1441 76.1542C96.9526 76.4101 96.6866 76.6006 96.3825 76.6996L83.9644 81.0849C83.4088 81.2793 82.9042 81.5962 82.4879 82.0122C82.0717 82.4282 81.7546 82.9325 81.5601 83.4878L77.2084 95.9228C77.1067 96.2344 76.9088 96.5058 76.6431 96.6979C76.3775 96.89 76.0577 96.993 75.7297 96.9921C75.3978 96.9916 75.0741 96.8886 74.803 96.6972C74.5319 96.5058 74.3265 96.2353 74.2151 95.9228L61.4363 63.0631C61.3153 62.773 61.2862 62.4528 61.3528 62.1456C61.4194 61.8384 61.5786 61.559 61.809 61.345C61.9533 61.1979 62.1253 61.0807 62.3151 61.0003C62.5049 60.9199 62.7088 60.8778 62.915 60.8765C63.119 60.8782 63.3216 60.9106 63.516 60.9726L96.4426 73.756C96.7593 73.854 97.0327 74.0579 97.2166 74.3337C97.4005 74.6094 97.4838 74.94 97.4524 75.2699Z" fill="#959595" />
                    </svg>


                    <h2>Glissé-déposé vos photos ici</h2>
                    <p>format png, jpg, tif, fit, raw autorisé</p>
                </div>
            ) : (

                viewMode === 'grid' ? (
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

                    <Table
                        selectedImage={selectedImages}
                        handleInputChange={handleInputChange}
                        data={limitedSortedImages()} // Assurez-vous que c'est un tableau d'objets
                        handleImageClick={handleImageClick}
                        isSelected={isSelected}
                        formatDate={formatDate}
                        handleImageDoubleClick={handleImageDoubleClick}
                    />

                )

            )}


            {showNotification && (
                <Notification
                    type='info' title="Chargement..." text={"Ouverture de l'image .fit dans une fenêtre séparée."}
                />
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
