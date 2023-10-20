import React, { useEffect, useCallback, useState } from "react";
import { CSSTransition } from 'react-transition-group';
import Header from './Header';
import ImportModal from "./ImportModal";
import { ArrowLeft, X, Info } from 'react-feather';


const ImageDisplayAndUploader = () => {
    // State pour gérer les images, l'état de la modal d'importation, l'état de la modal d'image, l'image sélectionnée, etc.
    const [images, setImages] = useState([]);
    const [ImportModalOpen, setImportModalOpen] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState({});
    const [uploadingImage, setUploadingImage] = useState({});
    const [sortOrder, setSortOrder] = useState('date-desc');
    const [objectSort, setObjectSort] = useState('all');
    const [TypeSort, setTypeSort] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [checkedImages, setCheckedImages] = useState([]);


    // Effet pour gérer le tri des images en fonction de l'objet sélectionné
    useEffect(() => {
        setSortOrder(objectSort === 'all' ? 'date-desc' : 'skyObject');
    }, [objectSort]);


    // Fonction pour gérer l'envoi des fichiers d'image à l'IPCRenderer
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
        setImportModalOpen(true);
    }, []);


    // Fonction pour gérer la sélection de fichiers
    const handleFileSelected = (e) => {
        handleImageUpload(Array.from(e.target.files));
    };

    // Fonction pour gérer le glisser-déposer d'images
    const onDrop = (e) => {
        e.preventDefault();
        handleImageUpload(Array.from(e.dataTransfer.files));
    };

    // Fonction pour empêcher le glisser-déposer par défaut du navigateur
    const preventDrag = e => {
        e.preventDefault();
    };

    // Fonction pour trier les images en fonction de l'ordre de tri sélectionné et du terme de recherche
    const sortedImages = () => {
        const sorted = [...images];

        switch (sortOrder) {
            case 'date-asc':
                sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'date-desc':
                sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
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


    // Objet pour gérer les actions d'image (ouverture, fermeture, etc.)
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


    // CSS pour l'animation de fondu
    const fadeIn = {
        animationName: 'fadeIn',
        animationDuration: '0.5s'
    };



    const handleDelete = id => window.electron.ipcRenderer.send("delete-image", id);


    // Effet pour écouter les événements IPCRenderer et mettre à jour l'état des images
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

    // Fonction pour regrouper les images en fonction de la clé de groupe
    const groupBy = (images, keyFunc) => images.reduce((acc, image) => {
        const key = keyFunc(image);
        if (!acc[key]) acc[key] = [];
        acc[key].push(image);
        return acc;
    }, {});


    // Fonction pour obtenir la clé de groupe en fonction de l'ordre de tri sélectionné
    const getGroupKey = img => sortOrder === 'skyObject' ? (img.skyObject || "Non défini") : new Date(img.date).toLocaleDateString();


    // Composant de la modal d'image avec détails
    const ImageModal = ({ isOpen, image, onClose }) => {
        const [showDetails, setShowDetails] = useState(false);
        const [isEditing, setIsEditing] = useState(false);
        const [editedImage, setEditedImage] = useState({ ...image });


        // Fonction pour gérer les modifications d'image
        const handleChange = (field, value) => {
            setEditedImage(prev => ({ ...prev, [field]: value }));
        };

        // Fonction pour enregistrer les modifications dans la base de données
        const saveChanges = () => {
            // Envoyez l'événement IPC pour mettre à jour la base de données avec editedImage
            electron.ipcRenderer.send('update-image-info', editedImage);
            setIsEditing(false);
        };

        // Rendu de la modal d'image avec détails
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


    // Fonction pour basculer la sélection d'une image
    const toggleImageCheck = (imageId) => {
        setCheckedImages(prevChecked => {
            if (prevChecked.includes(imageId)) {
                return prevChecked.filter(id => id !== imageId);
            } else {
                return [...prevChecked, imageId];
            }
        });
    };


    // Rendu du composant ImageDisplayAndUploader
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

            {/* Affichage des images */}
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




            {/* Conteneur pour les images */}

            <div className="container" onDrop={onDrop} onDragOver={e => e.preventDefault()} onDragStart={preventDrag}>
                {/* ... (options de tri, filtres, etc.) */}


                <div style={{ display: 'flex', gap: '8px' }} >
                    <label>

                        <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>

                            <option value="date-desc">Plus récente</option>
                            <option value="date-asc">Plus ancienne</option>
                        </select>
                    </label>

                    { /*

                        <label>
                            <select value={objectSort} onChange={e => setObjectSort(e.target.value)}>
                                <option value="all">Tous les objets</option>
                                <option value="Planet">Planète</option>
                                <option value="Star">Étoile</option>
                            </select>
                        </label> */
                    }


                    <label>
                        <select value={TypeSort} onChange={e => setTypeSort(e.target.value)}>
                            <option value="all">Tous types de photos</option>
                            <option value="Render">Rendu</option>
                            <option value="Brut">Brut</option>
                            <option value="Dark">Dark</option>
                            <option value="Flat">Flat</option>
                            <option value="Offset">Offset</option>
                        </select>
                    </label>
                </div>


                {/* Modale pour afficher les détails de l'image */}
                <ImageModal isOpen={isModalOpen} image={selectedImage} onClose={handleImageActions.close} />


                {/* Modale pour importer de nouvelles images */}
                <ImportModal isOpen={ImportModalOpen} onClose={() => setImportModalOpen(false)} />


                {/* Affichage des images triées et groupées */}
                {Object.entries(groupBy(sortedImages(), getGroupKey)).map(([key, imgs]) => (
                    <div key={key} style={{ marginBottom: '20px' }}>

                        <h2 style={{ marginTop: '40px' }}>{key}</h2>

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