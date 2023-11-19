import React, { useEffect, useState } from "react";


const DetailsPanel = ({ isSelected, sortedImages, selectedImage, handleDelete, handleInputChange, formatDate, handlePathFileChange, selectedImages }) => {


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


    const handleBlink = () => {
        const imagePaths = selectedImages.map(img => img.path);
        window.electron.ipcRenderer.send('start-blink', imagePaths);
    };


    return (
        <div className="details-section" >

            {selectedImages.length === 0 ? (
                <>
                    <p style={{ margin: 'auto', color: '#707070' }} >Pas de sélection</p>
                </>

            ) : selectedImages.length === 1 ? (

                <>
                    <div className='section-details'  >
                    <h4>Infos</h4>

                        <button
                            
                            onClick={() => handleDelete(selectedImage.id)}
                            className="secondary"
                        >
                            Supprimer
                        </button>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Nom:</p>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '70%' }} >
                                <input
                                    className="input-details"
                                    name="name"
                                    type="text"
                                    value={selectedImage.name.replace(/\.[^/.]+$/, "") || ''}
                                    onChange={handleInputChange}
                                    style={{ width: '100%' }}
                                />
                                <p style={{ width: 'fit-content' }} >.{selectedImage.name.slice(((selectedImage.name.lastIndexOf(".") - 1) >>> 0) + 2)}</p>
                            </div>

                        </div>
                    </div>


                    <div className='separator'></div>


                    <div className='section-details'  >
                        <h4>Détails Observation</h4>
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Objet:</p>
                            <input
                                className="input-details"
                                name="skyObject"
                                type="text"
                                value={selectedImage.skyObject || ''}
                                onChange={handleInputChange}
                            />

                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Objet Type:</p>
                            <select
                                className="input-details"
                                name="objectType"
                                type="text"
                                value={selectedImage.objectType || ''}
                                onChange={handleInputChange}
                            >
                                <option disabled='true' value="">Type d'objet</option>
                                <option value="Planets">Planets</option>
                                <option value="Stars">Stars</option>
                                <option value="Moons">Moons</option>
                                <option value="Asteroids">Asteroids</option>
                                <option value="Comets">Comets</option>
                                <option value="Dwarf Planets">Dwarf Planets</option>
                                <option value="Galaxies">Galaxies</option>
                                <option value="Nebulae">Nebulae</option>
                                <option value="White Dwarfs">White Dwarfs</option>
                                <option value="Neutron Stars">Neutron Stars</option>
                                <option value="Pulsars">Pulsars</option>
                                <option value="Quasars">Quasars</option>
                                <option value="Brown Dwarfs">Brown Dwarfs</option>
                                <option value="Exoplanets">Exoplanets</option>
                                <option value="Globular Clusters">Globular Clusters</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Constellation:</p>
                            <input
                                className="input-details"
                                name="constellation"
                                type="text"
                                value={selectedImage.constellation || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>AD:</p>
                            <input
                                className="input-details"
                                name="AD"
                                type="text"
                                value={selectedImage.AD || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>DEC:</p>
                            <input
                                className="input-details"
                                name="DEC"
                                type="text"
                                value={selectedImage.DEC || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Date:</p>
                            <input
                                className="input-details"
                                name="date"
                                type="text"
                                value={selectedImage.date ? formatDate(selectedImage.date) : ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Lieu:</p>
                            <input
                                className="input-details"
                                name="location"
                                type="text"
                                value={selectedImage.location || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Note:</p>
                            <textarea
                                style={{ height: '50px' }}
                                className="input-details"
                                name="note"
                                type="text"
                                value={selectedImage.note || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                    </div>

                    <div className='separator'></div>

                    <div className='section-details' >
                        <h4>Caractéristiques</h4>
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Type de photo:</p>

                            <select
                                className="input-details"
                                name="photoType"
                                value={selectedImage.photoType || ''}
                                onChange={handleInputChange}
                            >
                                <option disabled='true' value="">Type de fichier</option>
                                <option value="Render">Rendu</option>
                                <option value="Brut">Brut</option>
                                <option value="Dark">Dark</option>
                                <option value="Flat">Flat</option>
                                <option value="Offset">Offset</option>
                                <option value="Dessin">Dessin</option>
                            </select>
                        </div>

                        {selectedImage.photoType === "Render" && (
                            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>

                                <div>
                                    <p style={{ textAlign: 'left' }} >Brut</p>
                                    <div className='upload-container' >
                                        <div className="file-upload-container">
                                            <span className="file-name">
                                                {
                                                    selectedImage && selectedImage.brutPath
                                                        ? selectedImage.brutPath.split('/').pop() || 'Aucun brut sélectionné.'
                                                        : 'Aucun brut sélectionné.'
                                                }
                                            </span>
                                            {
                                                selectedImage && selectedImage.brutPath &&
                                                <img style={{ width: '30%' }} src={selectedImage.brutPath} alt="Selected" />
                                            }

                                        </div>
                                        <label className="file-upload-btn">
                                            Sélectionner...
                                            <input
                                                className="upload"
                                                type="file"
                                                onChange={(event) => handlePathFileChange('brut', event)}
                                                style={{ display: 'none' }}  // Cache le véritable input
                                            />
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <p style={{ textAlign: 'left' }} >Dark</p>
                                    <div className='upload-container' >
                                        <div className="file-upload-container">
                                            <span className="file-name">
                                                {
                                                    selectedImage && selectedImage.darkPath
                                                        ? selectedImage.darkPath.split('/').pop() || 'Aucun dark sélectionné.'
                                                        : 'Aucun dark sélectionné.'
                                                }
                                            </span>
                                            {
                                                selectedImage && selectedImage.darkPath &&
                                                <img style={{ width: '30%' }} src={selectedImage.darkPath} alt="Selected" />
                                            }
                                        </div>




                                        <label className="file-upload-btn">
                                            Sélectionner...
                                            <input
                                                className="upload"
                                                type="file"
                                                onChange={(event) => handlePathFileChange('dark', event)}
                                                style={{ display: 'none' }}  // Cache le véritable input
                                            />
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <p style={{ textAlign: 'left' }} >Offset</p>
                                    <div className='upload-container' >
                                        <div className="file-upload-container">
                                            <span className="file-name">
                                                {
                                                    selectedImage && selectedImage.offsetPath
                                                        ? selectedImage.offsetPath.split('/').pop() || 'Aucun offset sélectionné.'
                                                        : 'Aucun offset sélectionné.'
                                                }
                                            </span>
                                            {
                                                selectedImage && selectedImage.offsetPath &&
                                                <img style={{ width: '30%' }} src={selectedImage.offsetPath} alt="Selected" />
                                            }
                                        </div>

                                        <label className="file-upload-btn">
                                            Sélectionner...
                                            <input
                                                className="upload"
                                                type="file"
                                                onChange={(event) => handlePathFileChange('offset', event)}
                                                style={{ display: 'none' }}  // Cache le véritable input
                                            />
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <p style={{ textAlign: 'left' }} >Flat</p>
                                    <div className='upload-container' >
                                        <div className="file-upload-container">
                                            <span className="file-name">
                                                {
                                                    selectedImage && selectedImage.flatPath
                                                        ? selectedImage.flatPath.split('/').pop() || 'Aucun flat sélectionné.'
                                                        : 'Aucun flat sélectionné.'
                                                }
                                            </span>
                                            {
                                                selectedImage && selectedImage.flatPath &&
                                                <img style={{ width: '30%' }} src={selectedImage.flatPath} alt="Selected" />
                                            }
                                        </div>

                                        <label className="file-upload-btn">
                                            Sélectionner...
                                            <input
                                                className="upload"
                                                type="file"
                                                onChange={(event) => handlePathFileChange('flat', event)}
                                                style={{ display: 'none' }}  // Cache le véritable input
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Résolution:</p>
                            <p>{selectedImage.resolution}</p>
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Taille:</p>
                            <p>{selectedImage.size}</p>
                        </div>

                    </div>

                    <div className='separator'></div>


                    <div className='section-details' >
                        <h4>Spécifications Techniques</h4>
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%', }}>
                            <p>Instrument:</p>
                            <input
                                className="input-details"
                                name="instrument"
                                type="text"
                                value={selectedImage.instrument || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Tube optique:</p>
                            <input
                                className="input-details"
                                name="opticalTube"
                                type="text"
                                value={selectedImage.opticalTube || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Monture:</p>
                            <input
                                className="input-details"
                                name="mount"
                                type="text"
                                value={selectedImage.mount || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Caméra:</p>
                            <input
                                className="input-details"
                                name="camera"
                                type="text"
                                value={selectedImage.camera || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Exposition:</p>
                            <input
                                className="input-details"
                                name="exposition"
                                type="text"
                                value={selectedImage.exposition || ''}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                </>

            ) : (
                <>
                    <>
                        <div>
                            <div className='section-details' >
                                <h4>Multiple selection</h4>
                                <div style={{display:'flex', gap:'8px'}} >
                                    <button

                                       
                                        onClick={handleBlink}
                                        className="primary"
                                    >
                                        Blink
                                    </button>

                                    <button
                          
                                        onClick={() => handleDelete(selectedImages[0].id)}
                                        className="secondary"
                                    >
                                        Supprimer
                                    </button>

                                </div>


                            </div>

                            <div className='separator'></div>


                            <div className='section-details' >
                                <h4>Détails Observation</h4>
                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Objet:</p>
                                    <input
                                        className="input-details"
                                        name="skyObject"
                                        type="text"
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Objet Type:</p>
                                    <select
                                        className="input-details"
                                        name="objectType"
                                        type="text"
                                        onChange={handleInputChange}
                                    >
                                        <option disabled='true' value="">Type d'objet</option>
                                        <option value="Planets">Planets</option>
                                        <option value="Stars">Stars</option>
                                        <option value="Moons">Moons</option>
                                        <option value="Asteroids">Asteroids</option>
                                        <option value="Comets">Comets</option>
                                        <option value="Dwarf Planets">Dwarf Planets</option>
                                        <option value="Galaxies">Galaxies</option>
                                        <option value="Nebulae">Nebulae</option>
                                        <option value="White Dwarfs">White Dwarfs</option>
                                        <option value="Neutron Stars">Neutron Stars</option>
                                        <option value="Pulsars">Pulsars</option>
                                        <option value="Quasars">Quasars</option>
                                        <option value="Brown Dwarfs">Brown Dwarfs</option>
                                        <option value="Exoplanets">Exoplanets</option>
                                        <option value="Globular Clusters">Globular Clusters</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Constellation:</p>
                                    <input
                                        className="input-details"
                                        name="constellation"
                                        type="text"
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>AD:</p>
                                    <input
                                        className="input-details"
                                        name="AD"
                                        type="text"
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>DEC:</p>
                                    <input
                                        className="input-details"
                                        name="DEC"
                                        type="text"
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Date:</p>
                                    <input
                                        className="input-details"
                                        name="date"
                                        type="text"
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Lieu:</p>
                                    <input
                                        className="input-details"
                                        name="location"
                                        type="text"
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Note:</p>
                                    <textarea
                                        style={{ height: '50px' }}
                                        className="input-details"
                                        name="note"
                                        type="text"
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>


                            <div className='separator'></div>


                            <div className='section-details' >
                                <h4>Caractéristiques</h4>
                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Type de photo:</p>

                                    <select
                                        className="input-details"
                                        name="photoType"
                                        onChange={handleInputChange}
                                    >
                                        <option disabled='true' value="">Type de fichier</option>

                                        <option value="Brut">Brut</option>
                                        <option value="Dark">Dark</option>
                                        <option value="Flat">Flat</option>
                                        <option value="Offset">Offset</option>
                                        <option value="Dessin">Dessin</option>
                                    </select>
                                </div>



                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Résolution:</p>
                                    <p>{selectedImage.resolution}</p>
                                </div>

                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Taille:</p>
                                    <p>{selectedImage.size}</p>
                                </div>
                            </div>

                            <div className='separator'></div>


                            <div className='section-details' >
                                <h4>Spécifications Techniques</h4>
                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Instrument:</p>
                                    <input
                                        className="input-details"
                                        name="instrument"
                                        type="text"
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Tube optique:</p>
                                    <input
                                        className="input-details"
                                        name="opticalTube"
                                        type="text"
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Monture:</p>
                                    <input
                                        className="input-details"
                                        name="mount"
                                        type="text"
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Caméra:</p>
                                    <input
                                        className="input-details"
                                        name="camera"
                                        type="text"
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                                    <p>Exposition:</p>
                                    <input
                                        className="input-details"
                                        name="exposition"
                                        type="text"
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                </>
            )}

        </div>
    )

};


export default DetailsPanel;