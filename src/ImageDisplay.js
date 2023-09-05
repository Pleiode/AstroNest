import React, { useEffect, useCallback, useState } from "react";
import { CSSTransition } from 'react-transition-group';
import Header from './Header';

import { ArrowLeft, X, Info } from 'react-feather';


const ImageDisplayAndUploader = () => {
    const [images, setImages] = useState([]);
    const [skyObjectModalOpen, setSkyObjectModalOpen] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState({});
    const [uploadingImage, setUploadingImage] = useState({});
    const [sortOrder, setSortOrder] = useState('date-desc');
    const [objectSort, setObjectSort] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [checkedImages, setCheckedImages] = useState([]);

    useEffect(() => {
        setSortOrder(objectSort === 'all' ? 'date-desc' : 'skyObject');
    }, [objectSort]);

    const handleImageUpload = useCallback((files) => {
        files.forEach(file => {
            const imagePath = file.path;
            const currentUploadingImage = {
                path: imagePath,
                name: file.name,
                date: new Date()
            };

            setUploadingImage(currentUploadingImage);
            window.electron.ipcRenderer.send("image-uploaded", imagePath);
        });
        setSkyObjectModalOpen(true);
    }, []);

    const handleFileSelected = (e) => {
        handleImageUpload(Array.from(e.target.files));
    };

    const onDrop = (e) => {
        e.preventDefault();
        handleImageUpload(Array.from(e.dataTransfer.files));
    };

    const preventDrag = e => {
        e.preventDefault();
    };



    const sortedImages = () => {
        const sorted = [...images];

        switch (sortOrder) {
            case 'date-asc':
                sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'date-desc':
                sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'skyObject':
                sorted.sort((a, b) => (a.skyObject || '').localeCompare(b.skyObject || ''));
                break;
            default:
                break;
        }

        if (searchTerm) {
            return sorted.filter(img =>
                img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (img.skyObject && img.skyObject.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        } else {
            return objectSort === 'all' ? sorted : sorted.filter(img => img.skyObject === objectSort);
        }
    };



    const handleImageActions = {
        click: (image) => {
            setSelectedImage(image);
            setModalOpen(true);
            console.log("Modal should be open now!"); // Ajoutez cette ligne
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
            "update-skyObject-reply": (_, data) => {
                if (data.success) {
                    setImages(prevImages => {
                        const updatedImages = prevImages.map(img =>
                            img.id === uploadingImage.id ? { ...img, skyObject: uploadingImage.skyObject } : img
                        );
                        setSelectedImage(updatedImages.find(img => img.id === uploadingImage.id));
                        return updatedImages;
                    });
                }
            }
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


    const ImageModal = ({ isOpen, image, onClose }) => {
        const [showDetails, setShowDetails] = useState(false);
        const [isEditing, setIsEditing] = useState(false);
        const [editedImage, setEditedImage] = useState({ ...image });

        const handleChange = (field, value) => {
            setEditedImage(prev => ({ ...prev, [field]: value }));
        };

        const saveChanges = () => {
            // Envoyez l'événement IPC pour mettre à jour la base de données avec editedImage
            electron.ipcRenderer.send('update-image-info', editedImage);
            setIsEditing(false);
        };


        return (
            <CSSTransition in={isOpen} timeout={300} classNames="modal" unmountOnExit onExited={onClose}>
                <div className="image-modal">
                    <div className="modal-content">
                        <div className={`image-section ${showDetails ? 'shrink' : ''}`}>
                            <button className="close-button" onClick={onClose}><ArrowLeft strokeWidth={1.5} ></ArrowLeft></button>
                            {image && <img src={image.path} alt={image.name} className="selected-image" />}
                            <button className="button-close-detail" onClick={() => setShowDetails(!showDetails)}>
                                {showDetails ? <X strokeWidth={1.5} stroke="black" ></X> : <Info strokeWidth={1.5} ></Info>}
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






    const SkyObjectModal = ({ isOpen, onClose }) => {
        const [selectedSkyObject, setSelectedSkyObject] = useState("");

        const handleConfirm = () => {
            if (uploadingImage && selectedSkyObject) {
                setUploadingImage(prev => ({ ...prev, skyObject: selectedSkyObject }));
                window.electron.ipcRenderer.send("update-skyObject", { imageId: uploadingImage.id, skyObject: selectedSkyObject });
                onClose();
            }
        };

        return (
            <CSSTransition in={isOpen} timeout={300} classNames="modal" unmountOnExit onExited={onClose}>
                <div>
                    <h2>Associer à un objet céleste</h2>
                    <select value={selectedSkyObject} onChange={e => setSelectedSkyObject(e.target.value)}>
                        <option value="">--Choisissez un objet céleste--</option>
                        <option value="Star">Star</option>
                        <option value="Planet">Planet</option>
                    </select>
                    <button onClick={handleConfirm}>Confirmer</button>
                    <button onClick={onClose}>Annuler</button>
                </div>
            </CSSTransition>
        );
    };

    const toggleImageCheck = (imageId) => {
        setCheckedImages(prevChecked => {
            if (prevChecked.includes(imageId)) {
                return prevChecked.filter(id => id !== imageId);
            } else {
                return [...prevChecked, imageId];
            }
        });
    };



    return (
        <div style={{ width: '100%' }} >
            <div >

                {/* Barre de recherche */}
                <Header
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onImportClick={handleFileSelected}
                />
            </div>


            {checkedImages.length > 0 && (
                <div className="action-bar">


                    <p>{checkedImages.length} photos sélectionnées</p>
                    <button onClick={() => {
                        checkedImages.forEach(id => handleDelete(id));
                        setCheckedImages([]);
                    }}>
                        Supprimer
                    </button>
                </div>
            )}





            <div className="container" onDrop={onDrop} onDragOver={e => e.preventDefault()} onDragStart={preventDrag}>




                <div style={{ display: 'flex', gap: '8px' }} >
                    <label>

                        <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>

                            <option value="date-desc">Plus récente</option>
                            <option value="date-asc">Plus ancienne</option>
                        </select>
                    </label>
                    <label>

                        <select value={objectSort} onChange={e => setObjectSort(e.target.value)}>
                            <option value="all">Tous les objets</option>
                            <option value="Planet">Planète</option>
                            <option value="Star">Étoile</option>
                        </select>
                    </label>
                    <label>

                        <select value={objectSort} onChange={e => setObjectSort(e.target.value)}>

                            <option value="all">Tous types de photos</option>
                            <option value="Planet">Rendu</option>
                            <option value="Star">Brut</option>
                            <option value="Star">Dark</option>
                            <option value="Star">Flat</option>
                            <option value="Star">Offset</option>
                        </select>
                    </label>
                </div>



                <ImageModal isOpen={isModalOpen} image={selectedImage} onClose={handleImageActions.close} />




                <SkyObjectModal isOpen={skyObjectModalOpen} onClose={() => setSkyObjectModalOpen(false)} />
                {Object.entries(groupBy(sortedImages(), getGroupKey)).map(([key, imgs]) => (
                    <div key={key} style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '14px', marginTop: '40px' }}>{key}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'left' }}>
                            {imgs.map(image => (
                                <div key={image.id} className="image-container" style={{ position: 'relative' }}>
                                    <img src={image.path} alt={image.name} onClick={() => handleImageActions.click(image)} style={{ ...fadeIn, height: "200px", width: 'auto' }} />

                                    <input
                                        type="checkbox"
                                        className="image-checkbox"
                                        id={`checkbox-${image.id}`}
                                        checked={checkedImages.includes(image.id)}
                                        onChange={() => toggleImageCheck(image.id)}
                                    />
                                    <label
                                        htmlFor={`checkbox-${image.id}`}
                                        className="custom-checkbox"></label>

                                </div>
                            ))}


                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ImageDisplayAndUploader;