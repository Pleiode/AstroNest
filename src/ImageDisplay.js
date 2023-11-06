import React, { useEffect, useState, useRef } from "react";
import { CSSTransition } from 'react-transition-group';
import Header from './Header';
import { Grid, List } from 'react-feather';
import Tiff from 'tiff.js';
import ImageModal from './ImageModal';
import * as FITS from 'fitsjs';
import { SelectableGroup, createSelectable } from 'react-selectable-fast';

const ImageDisplayAndUploader = () => {
    const [images, setImages] = useState([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState({});
    const [sortOrder, setSortOrder] = useState('date-desc');
    const [objectSort, setObjectSort] = useState('all');
    const [TypeSort, setTypeSort] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState(localStorage.getItem('viewMode') || 'grid');
    const [showDetailsPanel, setShowDetailsPanel] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    let clickTimeout;

    const [file, setFile] = useState(null);

    const [brutFileName, setBrutFileName] = useState('Aucun fichier choisi');
    const [brutPath, setBrutFilePath] = useState(''); // État pour stocker le chemin d'accès


    const isSelected = (image) => {
        return selectedImages.some(selected => image.id === selected.id);
    };


    const handleImageClick = (image, event) => {
        if (event.ctrlKey || event.metaKey) {
            setSelectedImages(prevImages => {
                if (isSelected(image)) {

                    return prevImages.filter(selected => selected.id !== image.id);
                } else {
                    return [...prevImages, image];
                }
            });
        } else {
            setSelectedImages([image]);
        }
        setShowDetailsPanel(true);
    };

    const handleImageDoubleClick = () => {
        clearTimeout(clickTimeout);
        console.log("2 clicks");
        openImageModal();
    };

    const openImageModal = () => {
        if (showDetailsPanel) {
            setShowDetails(true);
        }
    };


    useEffect(() => {
        localStorage.setItem('viewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        setSortOrder(objectSort === 'all' ? 'date-desc' : 'skyObject');
    }, [objectSort]);


    
    const sortedImages = () => {
        let sorted = [...images];

        if (sortOrder === 'date-asc') {
            sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else if (sortOrder === 'date-desc') {
            sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        if (TypeSort !== 'all') {
            sorted = sorted.filter(img => img.photoType === TypeSort);
        }

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            return sorted.filter(img => {
                return Object.values(img).some(value =>
                    String(value).toLowerCase().includes(lowerCaseSearchTerm)
                );
            });
        } else {
            return objectSort === 'all' ? sorted : sorted.filter(img => img.skyObject === objectSort);
        }
    };

    const handleImageActions = {
        click: (image) => {
            setSelectedImage(image);
            setModalOpen(true);
            console.log("Modal should be open now!");
        },
        close: () => {
            setModalOpen(false);
        }
    };


    const fadeIn = {
        animationName: 'fadeIn',
        animationDuration: '0.5s'
    };

    const handleDelete = id => window.electron.ipcRenderer.send("delete-image", id);

    useEffect(() => {
        const { ipcRenderer } = window.electron;
        ipcRenderer.send("get-images");

        const listeners = {
            "get-images-reply": (_, fetchedImages) => setImages(fetchedImages),
            "image-deleted": () => ipcRenderer.send("get-images"),
            "image-added": (_, imageId) => {
                setUploadingImage(prev => ({ ...prev, id: imageId }));
                ipcRenderer.send("get-images");
            },
        };

        for (const [event, callback] of Object.entries(listeners)) {
            ipcRenderer.on(event, callback);
        }

        return () => {
            for (const event of Object.keys(listeners)) {
                ipcRenderer.removeAllListeners(event);
            }
        };
    }, []);

    const groupBy = (images, keyFunc) => images.reduce((acc, image) => {
        const key = keyFunc(image);
        if (!acc[key]) acc[key] = [];
        acc[key].push(image);
        return acc;
    }, {});

    const getGroupKey = img => sortOrder === 'skyObject' ? (img.skyObject || "Non défini") : new Date(img.date).toLocaleDateString();

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const date = new Date(dateString);

        if (isNaN(date)) {
            // Retournez une chaîne vide ou un message d'erreur si la date n'est pas valide
            return '';
        }

        return date.toLocaleDateString('fr-FR', options);
    }





    useEffect(() => {
        const { ipcRenderer } = window.electron;

        const updateImageFieldResponse = (_, response) => {
            if (response.success) {
                console.log('Field updated successfully', response.changes);
                ipcRenderer.send("get-images");
            } else {
                console.error('Failed to update field:', response.error);
            }
        };

        ipcRenderer.on('update-image-field-response', updateImageFieldResponse);

        const getImagesReply = (_, fetchedImages) => {
            setImages(fetchedImages);
            const updatedSelectedImage = fetchedImages.find(img => img.id === selectedImage.id);
            if (updatedSelectedImage) {
                setSelectedImage(updatedSelectedImage);
            }
        };

        ipcRenderer.on("get-images-reply", getImagesReply);

        return () => {
            ipcRenderer.removeListener('update-image-field-response', updateImageFieldResponse);
            ipcRenderer.removeListener("get-images-reply", getImagesReply);
        };
    }, []);

    const handleInputChange = (event) => {
        const { name } = event.target;
        const file = event.target.files[0]; // Obtenez le premier fichier sélectionné

        if (file) {
            const filePath = file.path; // Obtenez le chemin du fichier

            // Mettez à jour l'état de selectedImages avec le nouveau chemin du fichier
            setSelectedImages(prevImages => {
                const updatedImages = prevImages.map(img => ({
                    ...img,
                    [name]: filePath, // Utilisez le nom de l'input pour définir la propriété correspondante dans l'objet image
                }));

                // Envoyez une mise à jour à l'IPCRenderer pour chaque image mise à jour
                updatedImages.forEach(image => {
                    window.electron.ipcRenderer.send('update-image-field', {
                        id: image.id,
                        [name]: filePath,
                    });
                });
                return updatedImages;
            });
        }
    };


    const handleBrutFileChange = (event) => {
        const file = event.target.files[0]; // Obtenez le premier fichier sélectionné
        if (file) {
            const brutPath = file.path;
            setBrutFilePath(brutPath); // Mettre à jour le chemin du fichier dans l'état
            setBrutFileName(file.name); // Mettre à jour le nom du fichier dans l'état si nécessaire

            // Mise à jour de l'état de selectedImages avec le nouveau chemin du fichier
            setSelectedImages(prevImages => {
                
                const updatedImages = prevImages.map(img => ({
                    ...img,
                    ...selectedImages[0],
                    path: brutPath,
                     // Assurez-vous que 'path' est le nom de la propriété que vous utilisez pour le chemin du fichier dans vos objets image
                }));

                // Envoyez une mise à jour à l'IPCRenderer pour chaque image mise à jour
                updatedImages.forEach(image => {
                    window.electron.ipcRenderer.send('update-image-field', {
                        id: image.id,
                        brutPath: brutPath,
                    });
                });
                console.log(brutPath);
        
                return prevImages.map((img, index) => {
                    if (index === 0) { // Supposons que vous mettez toujours à jour la première image
                        return { ...img, brutPath: brutPath };
                    }
                    return img;
                });
            });
        }
    };


    return (
        <div style={{ width: '100%' }}>
            <div>
                <Header
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                />
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <label>
                                <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                                    <option value="date-desc">Plus récente</option>
                                    <option value="date-asc">Plus ancienne</option>
                                </select>
                            </label>

                            <label>
                                <select value={TypeSort} onChange={e => setTypeSort(e.target.value)}>
                                    <option value="all">Tous types de photos</option>
                                    <option value="Render">Rendu</option>
                                    <option value="Brut">Brut</option>
                                    <option value="Dark">Dark</option>
                                    <option value="Flat">Flat</option>
                                    <option value="Offset">Offset</option>
                                    <option value="Dessin">Dessin</option>
                                </select>
                            </label>
                        </div>

                        <div className="switch-container" onClick={() => setViewMode(prevMode => prevMode === 'grid' ? 'list' : 'grid')}>
                            <span className={`switch-label ${viewMode === 'list' ? 'active' : ''}`}> <List strokeWidth={2} width={'16px'} /> Liste</span>
                            <span className={`switch-label ${viewMode === 'grid' ? 'active' : ''}`}> <Grid strokeWidth={2} width={'16px'} /> Grille</span>
                        </div>

                    </div>

                    <div className="container" onDrop={onDrop} onDragOver={e => e.preventDefault()} onDragStart={preventDrag}>
                        <ImageModal
                            isOpen={isModalOpen}
                            image={selectedImage}
                            onClose={handleImageActions.close}
                            loadImageToCanvas={(src, img, cb) => loadImageToCanvas(src, img, cb, viewMode)}
                        />

                        {viewMode === 'grid' ? (
                            Object.entries(groupBy(sortedImages(), getGroupKey)).map(([key, imgs]) => (
                                <div key={key}>
                                    <h2>{key}</h2>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'left' }}>
                                        {imgs.map(image => (
                                            <div key={image.id} className={`image-container ${viewMode}`} style={{ position: 'relative' }}>

                                                <img src={image.path}
                                                    alt={image.name}
                                                    onClick={(e) => handleImageClick(image, e)}
                                                    className={isSelected(image) ? 'focus-image' : ''}
                                                    onDoubleClick={handleImageDoubleClick} style={{ ...fadeIn, height: "100px", width: 'auto' }} />

                                            </div>
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
                                                {image.path.endsWith('.tif') ? (
                                                    <canvas ref={canvas => loadImageToCanvas(image.path, image, (loadedCanvas) => {
                                                        canvas.parentNode.replaceChild(loadedCanvas, canvas);
                                                    })} />
                                                ) : (
                                                    <img src={image.path} alt={image.name} style={{ height: "40px", width: 'auto' }} />
                                                )}
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
                </div>

                {showDetailsPanel && !showDetails && (
                    <div className="details-section">
                        {selectedImages.length === 0 ? (
                            <>
                                <p style={{ margin: 'auto', color: '#707070' }} >Pas de sélection</p>
                            </>


                        ) : selectedImages.length === 1 ? (
                            <>
                                <button
                                    style={{ width: '100%' }}
                                    onClick={() => handleDelete(selectedImages[0].id)}
                                    className="secondary"
                                >
                                    Supprimer l'image
                                </button>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Nom:</p>
                                    <input
                                        className="input-details"
                                        name="name"
                                        type="text"
                                        value={selectedImages[0].name || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <h4>Détails Observation</h4>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Objet:</p>
                                    <input
                                        className="input-details"
                                        name="skyObject"
                                        type="text"
                                        value={selectedImages[0].skyObject || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Objet Type:</p>
                                    <select
                                        className="input-details"
                                        name="objectType"
                                        type="text"
                                        value={selectedImages[0].objectType || ''}
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

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Constellation:</p>
                                    <input
                                        className="input-details"
                                        name="constellation"
                                        type="text"
                                        value={selectedImages[0].constellation || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>AD:</p>
                                    <input
                                        className="input-details"
                                        name="AD"
                                        type="text"
                                        value={selectedImages[0].AD || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>DEC:</p>
                                    <input
                                        className="input-details"
                                        name="DEC"
                                        type="text"
                                        value={selectedImages[0].DEC || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Date:</p>
                                    <input
                                        className="input-details"
                                        name="date"
                                        type="text"
                                        value={selectedImages[0].date ? formatDate(selectedImages[0].date) : ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Lieu:</p>
                                    <input
                                        className="input-details"
                                        name="location"
                                        type="text"
                                        value={selectedImages[0].location || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Note:</p>
                                    <textarea
                                        style={{ height: '50px' }}
                                        className="input-details"
                                        name="note"
                                        type="text"
                                        value={selectedImages[0].note || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <h4>Caractéristiques Photo</h4>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Type de photo:</p>

                                    <select
                                        className="input-details"
                                        name="photoType"
                                        value={selectedImages[0].photoType || ''}
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

                                {selectedImages[0].photoType === "Render" && (
                                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                                        <p style={{ margin: '0' }}>Lier des DOFs à votre rendu</p>
                                        <div>
                                            <p>Brut</p>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <div className="file-upload-container">

                                                    <img style={{ width: '50px' }} src={selectedImages[0].brutPath}>
                                                    </img>

                                                    <span className="file-name">{selectedImages[0].brutPath.split('/').pop()}</span>

                                                    <label className="file-upload-btn">
                                                        Sélectionner...
                                                        <input
                                                            className="upload"
                                                            type="file"
                                                            onChange={handleBrutFileChange}
                                                            style={{ display: 'none' }}  // Cache le véritable input

                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <p>Dark</p>
                                            <div style={{ display: 'flex', gap: '8px' }}></div>
                                        </div>
                                        <div>
                                            <p>Offset</p>
                                            <div style={{ display: 'flex', gap: '8px' }}></div>
                                        </div>
                                        <div>
                                            <p>Flat</p>
                                            <div style={{ display: 'flex', gap: '8px' }}></div>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Résolution:</p>
                                    <p>{selectedImages[0].resolution}</p>
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Taille:</p>
                                    <p>{selectedImages[0].size}</p>
                                </div>

                                <h4>Spécifications Techniques</h4>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%', }}>
                                    <p>Instrument:</p>
                                    <input
                                        className="input-details"
                                        name="instrument"
                                        type="text"
                                        value={selectedImages[0].instrument || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Tube optique:</p>
                                    <input
                                        className="input-details"
                                        name="opticalTube"
                                        type="text"
                                        value={selectedImages[0].opticalTube || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Monture:</p>
                                    <input
                                        className="input-details"
                                        name="mount"
                                        type="text"
                                        value={selectedImages[0].mount || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Caméra:</p>
                                    <input
                                        className="input-details"
                                        name="camera"
                                        type="text"
                                        value={selectedImages[0].camera || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                    <p>Exposition:</p>
                                    <input
                                        className="input-details"
                                        name="exposition"
                                        type="text"
                                        value={selectedImages[0].exposition || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <button
                                        style={{ width: '100%' }}
                                        onClick={() => handleDelete(selectedImages[0].id)}
                                        className="secondary"
                                    >
                                        Supprimer l'image
                                    </button>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Nom:</p>
                                        <input
                                            className="input-details"
                                            name="name"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <h4>Détails Observation</h4>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Objet:</p>
                                        <input
                                            className="input-details"
                                            name="skyObject"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
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

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Constellation:</p>
                                        <input
                                            className="input-details"
                                            name="constellation"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>AD:</p>
                                        <input
                                            className="input-details"
                                            name="AD"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>DEC:</p>
                                        <input
                                            className="input-details"
                                            name="DEC"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Date:</p>
                                        <input
                                            className="input-details"
                                            name="date"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Lieu:</p>
                                        <input
                                            className="input-details"
                                            name="location"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Note:</p>
                                        <textarea
                                            style={{ height: '50px' }}
                                            className="input-details"
                                            name="note"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <h4>Caractéristiques Photo</h4>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Type de photo:</p>

                                        <select
                                            className="input-details"
                                            name="photoType"
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
                                        <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                                            <p style={{ margin: '0' }}>Lier des DOFs à votre rendu</p>
                                            <div>
                                                <p>Brut</p>
                                                <div style={{ display: 'flex', gap: '8px' }}></div>
                                            </div>
                                            <div>
                                                <p>Dark</p>
                                                <div style={{ display: 'flex', gap: '8px' }}></div>
                                            </div>
                                            <div>
                                                <p>Offset</p>
                                                <div style={{ display: 'flex', gap: '8px' }}></div>
                                            </div>
                                            <div>
                                                <p>Flat</p>
                                                <div style={{ display: 'flex', gap: '8px' }}></div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Résolution:</p>
                                        <p>{selectedImage.resolution}</p>
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Taille:</p>
                                        <p>{selectedImage.size}</p>
                                    </div>

                                    <h4>Spécifications Techniques</h4>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Instrument:</p>
                                        <input
                                            className="input-details"
                                            name="instrument"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Tube optique:</p>
                                        <input
                                            className="input-details"
                                            name="opticalTube"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Monture:</p>
                                        <input
                                            className="input-details"
                                            name="mount"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Caméra:</p>
                                        <input
                                            className="input-details"
                                            name="camera"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                                        <p>Exposition:</p>
                                        <input
                                            className="input-details"
                                            name="exposition"
                                            type="text"
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </>
                        )}




                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageDisplayAndUploader;