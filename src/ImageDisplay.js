import React, { useEffect, useRef, useState } from 'react';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';


const ImageDisplay = ({ viewMode, sortedImages, groupBy, getGroupKey, handleImageClick, isSelected, handleImageDoubleClick, formatDate }) => {


    const [convertedImages, setConvertedImages] = useState({});
    const [loadingImages, setLoadingImages] = useState({});



    const convertImage = (imagePath) => {
        if (!convertedImages[imagePath]) {
            setLoadingImages(prev => ({ ...prev, [imagePath]: true }));
            window.electron.ipcRenderer.send('convert-fit', imagePath);
        }
    };


    // Convertir les images FITS en WebP
    useEffect(() => {

        sortedImages().forEach(image => {
            if ((image.path.endsWith('.fit') || image.path.endsWith('.fits')) && !convertedImages[image.path]) {
                convertImage(image.path);
            }
        });

        const conversionListener = (event, { imagePath, convertedPath }) => {
            setConvertedImages(prev => ({ ...prev, [imagePath]: convertedPath }));
            setLoadingImages(prev => ({ ...prev, [imagePath]: false }));
        };



        window.electron.ipcRenderer.on('conversion-done', conversionListener);

        return () => {
            window.electron.ipcRenderer.off('conversion-done', conversionListener);
        };
    }, [sortedImages]);



    // Charger les images FITS
    const getImageSrc = (image) => {
        return convertedImages[image.path] || image.path;
    };



    const renderImage = (image) => {
        const isImageLoading = loadingImages[image.path];

        return isImageLoading ? (
            <div className="skeleton"></div>
        ) : (
            <img
                loading='lazy'
                onClick={(e) => handleImageClick(image, e)}
                key={image.id}
                src={getImageSrc(image)}
                alt={`Image de ${image.name}`}
                className={isSelected(image) ? 'focus-image' : ''}
                style={{ width: 'auto', height: '100px' }}
            />
        );
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


 

    return (
        <div className="container" >
            {viewMode === 'grid' ? (
                Object.entries(groupBy(sortedImages(), getGroupKey)).map(([key, imgs]) => (
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
                        {sortedImages().map(image => (
                            <tr onClick={(e) => handleImageClick(image, e)}
                                key={image.id}
                            >
                                <td className={isSelected(image) ? 'focus' : ''}  >

                                    <img
                                        key={image.id}
                                        src={getImageSrc(image)}
                                        alt={image.name}
                                        style={{ height: "100px", width: 'auto' }}
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
        </div>
    );

}

export default ImageDisplay;
