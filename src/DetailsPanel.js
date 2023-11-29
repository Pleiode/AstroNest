import React, { useEffect, useState } from "react";
import { Trash, Archive, Share } from 'react-feather';




const DetailsPanel = ({ isSelected, sortedImages, selectedImage, handleInputChange, formatDate, handlePathFileChange, selectedImages }) => {


    const handleDelete = ids => {
        console.log(ids); // Vérifiez ce que contient ids
        ids.forEach(id => window.electron.ipcRenderer.send("delete-image", id));
    };



    const handleBlink = () => {
        const imagePaths = selectedImages.map(img => img.path);
        window.electron.ipcRenderer.send('start-blink', imagePaths);
    };


    const openInFinder = (filePath) => {
        window.electron.ipcRenderer.send('open-in-finder', filePath);
    };


    useEffect(() => {
        window.electron.ipcRenderer.on('export-image-success', (event, savePath) => {
            console.log('Image exportée avec succès:', savePath);
            // Afficher une notification de succès ou mettre à jour l'interface utilisateur
        });

        window.electron.ipcRenderer.on('export-image-failure', (event, error) => {
            console.error('Erreur lors de l\'exportation de l\'image:', error);
            // Afficher une notification d'erreur ou mettre à jour l'interface utilisateur
        });

        // Nettoyage
        return () => {
            window.electron.ipcRenderer.removeAllListeners('export-image-success');
            window.electron.ipcRenderer.removeAllListeners('export-image-failure');
        };
    }, []);



    const handleExportClick = (filePath) => {
        if (filePath) {
            console.log(filePath);
            window.electron.ipcRenderer.send('export-image', filePath);
        }
    };



    return (
        <div className="details-section" >

            {selectedImages.length === 0 ? (
                <>
                    <p style={{ margin: 'auto', color: '#707070' }} >Pas de sélection</p>
                </>

            ) : selectedImages.length === 1 ? (

                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }} className='section-details'  >

                        <div style={{ display: 'flex', gap: '8px' }} >
                            <button
                                style={{ backgroundColor: '#8532F2' }}
                                onClick={handleBlink}
                                className="special inactive"
                                disabled
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clip-path="url(#clip0_274_2135)">
                                        <path d="M6.97066 4.23595C7.274 4.13323 7.274 3.95062 6.97066 3.83649L5.32567 3.22019C5.034 3.11747 4.69567 2.78649 4.579 2.48975L3.949 0.880513C3.844 0.583774 3.65734 0.583774 3.54067 0.880513L2.91067 2.48975C2.80567 2.77508 2.46734 3.10606 2.164 3.22019L0.519004 3.83649C0.215671 3.93921 0.215671 4.12182 0.519004 4.23595L2.164 4.85225C2.45567 4.95497 2.794 5.28595 2.91067 5.58269L3.54067 7.1919C3.64567 7.48864 3.83234 7.48864 3.949 7.1919L4.579 5.58269C4.684 5.29736 5.02234 4.96639 5.32567 4.85225L6.97066 4.23595Z" fill="white" />
                                        <path d="M14.9858 9.87398C15.9191 9.64572 15.9191 9.26908 14.9858 9.04082L12.9208 8.53865C11.9874 8.31039 11.0308 7.37452 10.7974 6.46148L10.2841 4.44137C10.0508 3.52833 9.66575 3.52833 9.43242 4.44137L8.91909 6.46148C8.68576 7.37452 7.72909 8.31039 6.79576 8.53865L4.73076 9.04082C3.79743 9.26908 3.79743 9.64572 4.73076 9.87398L6.79576 10.3762C7.72909 10.6044 8.68576 11.5403 8.91909 12.4533L9.43242 14.4734C9.66575 15.3865 10.0508 15.3865 10.2841 14.4734L10.7974 12.4533C11.0308 11.5403 11.9874 10.6044 12.9208 10.3762L14.9858 9.87398Z" fill="white" />
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_274_2135">
                                            <rect width="16" height="15" fill="white" transform="translate(0 0.5)" />
                                        </clipPath>
                                    </defs>
                                </svg>

                                Blink
                            </button>


                            <button onClick={() => openInFinder(selectedImage.path)}
                                className="special"
                            >
                                <Archive
                                    color="var(--white)"
                                    size={14} />
                                Open Source
                            </button>


                            <button onClick={() => selectedImage && handleExportClick(selectedImage.path)}
                                className="special"
                            >
                                <Share
                                    color="var(--white)"
                                    size={14} />
                                Exporter
                            </button>


                        </div>


                        <button
                            onClick={() => handleDelete(selectedImages.map(img => img.id))}
                            className="special"
                        >
                            <Trash
                                color="var(--white)"
                                size={14} />
                            
                        </button>


                    </div>


                    <div className='separator'></div>


                    <div className='section-details'  >

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Nom</p>
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



                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Résolution</p>
                            <p>{selectedImage.resolution}</p>
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Taille</p>
                            <p>{selectedImage.size}</p>
                        </div>

                    </div>

                    <div className='separator'></div>

                    <div className='section-details' >
                        <h4>Spécifications Techniques</h4>
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%', }}>
                            <p>Instrument</p>
                            <input
                                className="input-details"
                                name="instrument"
                                type="text"
                                value={selectedImage.instrument || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Tube optique</p>
                            <input
                                className="input-details"
                                name="opticalTube"
                                type="text"
                                value={selectedImage.opticalTube || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Monture</p>
                            <input
                                className="input-details"
                                name="mount"
                                type="text"
                                value={selectedImage.mount || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Caméra</p>
                            <input
                                className="input-details"
                                name="camera"
                                type="text"
                                value={selectedImage.camera || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Exposition</p>
                            <input
                                className="input-details"
                                name="exposition"
                                type="text"
                                value={selectedImage.exposition || ''}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>


                    <div className='separator'></div>


                    <div className='section-details'  >
                        <h4>Détails Observation</h4>
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Objet</p>
                            <input
                                className="input-details"
                                name="skyObject"
                                type="text"
                                value={selectedImage.skyObject || ''}
                                onChange={handleInputChange}
                            />

                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Objet Type</p>
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
                            <p>Constellation</p>
                            <input
                                className="input-details"
                                name="constellation"
                                type="text"
                                value={selectedImage.constellation || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>AD</p>
                            <input
                                className="input-details"
                                name="AD"
                                type="text"
                                value={selectedImage.AD || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>DEC</p>
                            <input
                                className="input-details"
                                name="DEC"
                                type="text"
                                value={selectedImage.DEC || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Date</p>
                            <input
                                className="input-details"
                                name="date"
                                type="text"
                                value={selectedImage.date ? formatDate(selectedImage.date) : ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Lieu</p>
                            <input
                                className="input-details"
                                name="location"
                                type="text"
                                value={selectedImage.location || ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <p>Note</p>
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
                            <p>Type de photo</p>

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

                    </div>



                </>

            ) : (
                <>
                    <>
                        <div>


                            <div style={{ display: 'flex', justifyContent: 'space-between' }} className='section-details'  >

                                <div style={{ display: 'flex', gap: '8px' }} >
                                    <button
                                        style={{ backgroundColor: '#8532F2' }}
                                        onClick={handleBlink}
                                        className="special"

                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <g clip-path="url(#clip0_274_2135)">
                                                <path d="M6.97066 4.23595C7.274 4.13323 7.274 3.95062 6.97066 3.83649L5.32567 3.22019C5.034 3.11747 4.69567 2.78649 4.579 2.48975L3.949 0.880513C3.844 0.583774 3.65734 0.583774 3.54067 0.880513L2.91067 2.48975C2.80567 2.77508 2.46734 3.10606 2.164 3.22019L0.519004 3.83649C0.215671 3.93921 0.215671 4.12182 0.519004 4.23595L2.164 4.85225C2.45567 4.95497 2.794 5.28595 2.91067 5.58269L3.54067 7.1919C3.64567 7.48864 3.83234 7.48864 3.949 7.1919L4.579 5.58269C4.684 5.29736 5.02234 4.96639 5.32567 4.85225L6.97066 4.23595Z" fill="white" />
                                                <path d="M14.9858 9.87398C15.9191 9.64572 15.9191 9.26908 14.9858 9.04082L12.9208 8.53865C11.9874 8.31039 11.0308 7.37452 10.7974 6.46148L10.2841 4.44137C10.0508 3.52833 9.66575 3.52833 9.43242 4.44137L8.91909 6.46148C8.68576 7.37452 7.72909 8.31039 6.79576 8.53865L4.73076 9.04082C3.79743 9.26908 3.79743 9.64572 4.73076 9.87398L6.79576 10.3762C7.72909 10.6044 8.68576 11.5403 8.91909 12.4533L9.43242 14.4734C9.66575 15.3865 10.0508 15.3865 10.2841 14.4734L10.7974 12.4533C11.0308 11.5403 11.9874 10.6044 12.9208 10.3762L14.9858 9.87398Z" fill="white" />
                                            </g>
                                            <defs>
                                                <clipPath id="clip0_274_2135">
                                                    <rect width="16" height="15" fill="white" transform="translate(0 0.5)" />
                                                </clipPath>
                                            </defs>
                                        </svg>

                                        Blink
                                    </button>


                                    <button onClick={() => openInFinder(selectedImage.path)}
                                        className="special inactive"
                                        disabled
                                    >
                                        <Archive
                                            color="var(--white)"
                                            size={16} />
                                    </button>

                                </div>


                                <button
                                    onClick={() => handleDelete(selectedImages.map(img => img.id))}
                                    className="special"
                                >
                                    <Trash
                                        color="var(--white)"
                                        size={16} />
                                </button>


                            </div>


                            <div className='separator'></div>


                            <div className='section-details' >
                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>

                                    <p>Sélection multiple</p>

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


                        </div>
                    </>
                </>
            )}

        </div>
    )

};


export default DetailsPanel;