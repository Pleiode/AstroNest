import React, { useEffect, useState, useRef, useCallback } from "react";

import { Grid, List, Download } from 'react-feather';
import DetailsPanel from "./DetailsPanel";
import ImageDisplay from "./ImageDisplay";
import Notification from "./notification";



const Container = () => {
    const [images, setImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState({});
    const [sortOrder, setSortOrder] = useState('date-desc');
    const [objectSort, setObjectSort] = useState('all');
    const [TypeSort, setTypeSort] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState(localStorage.getItem('viewMode') || 'grid');
    const [showDetailsPanel, setShowDetailsPanel] = useState(true);
    const [selectedImages, setSelectedImages] = useState([]);

    // States for handling file information
    const [darkFileName, setDarkFileName] = useState('No file selected');
    const [darkPath, setDarkFilePath] = useState('');

    const [brutFileName, setBrutFileName] = useState('No file selected');
    const [brutPath, setBrutFilePath] = useState('');

    const [offsetFileName, setOffsetFileName] = useState('No file selected');
    const [offsetPath, setOffsetFilePath] = useState('');

    const [flatFileName, setFlatFileName] = useState('No file selected');
    const [flatPath, setFlatFilePath] = useState('');

    // State and ref declarations for the Header component
    const fileInputRef = useRef(null);

    const [selectedFiles, setSelectedFiles] = useState([]);

    // States for form inputs
    const [tags, setTags] = useState([]);
    const [constellation, setConstellation] = useState('');
    const [location, setLocation] = useState('');
    const [opticalTube, setOpticalTube] = useState('');
    const [mount, setMount] = useState('');
    const [camera, setCamera] = useState('');
    const [objectType, setObjectType] = useState('');

    // State for sky objects
    const [skyObjects, setSkyObjects] = useState([]);

    // State for tracking the type of image being uploaded
    const [selectedType, setSelectedType] = useState('');
    const [uploadingImage, setUploadingImage] = useState({});


    const [showNotificationFirstEdit, setShowNotificationFirstEdit] = useState(false);


    // State for tracking the type of image being uploaded
    const isSelected = (image) => {
        return selectedImages.some(selected => image.id === selected.id);
    };


    const handleImageClick = (image, event) => {
        if (event.ctrlKey || event.metaKey) {
            // Gérer la sélection multiple avec Ctrl ou Meta (Cmd) + clic
            setSelectedImages(prevImages => {
                if (isSelected(image)) {
                    return prevImages.filter(selected => selected.id !== image.id);
                } else {
                    return [...prevImages, image];
                }
            });
        } else {
            // Sélectionner uniquement l'image cliquée
            setSelectedImages([image]);
        }
    };





    useEffect(() => {

        if (!localStorage.getItem('firstLaunch')) {
            alert(
                "Bienvenue dans la version bêta de notre application !\n\n" +
                "Sachez que des bugs et des problèmes peuvent survenir. Vos retours et suggestions sont précieux pour nous aider à améliorer l'expérience.\n\n" +
                "Pendant cette phase de test, nous ne pouvons être tenus responsables des pertes de données.\n\n" +
                "Merci de votre compréhension et de votre soutien !"
            );
            localStorage.setItem('firstLaunch', 'true');
        }


        // Check local storage on component mount
        const hasEdited = localStorage.getItem("hasEdited");
        if (hasEdited) {
            setShowNotificationFirstEdit(false);
        }
    }, []);


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
        let value = event.target.value; // Valeur pour les inputs de type texte

        // Si c'est un input de type fichier, traiter les fichiers
        if (event.target.type === 'file') {
            const file = event.target.files[0]; // Obtenez le premier fichier sélectionné
            if (file) {
                value = file.path; // Utilisez le chemin du fichier comme valeur
            }
        }

        // Mettez à jour l'état de selectedImages avec la nouvelle valeur
        setSelectedImages(prevImages => {
            const updatedImages = prevImages.map(img => ({
                ...img,
                [name]: value, // Utilisez le nom de l'input pour définir la propriété correspondante dans l'objet image
            }));

            // Envoyez une mise à jour à l'IPCRenderer pour chaque image mise à jour
            updatedImages.forEach(image => {
                window.electron.ipcRenderer.send('update-image-field', {
                    id: image.id,
                    [name]: value,
                });
            });
            return updatedImages;
        });


        const hasEdited = localStorage.getItem("hasEdited");
        if (!hasEdited) {
            setShowNotificationFirstEdit(true); // Show notification
            localStorage.setItem("hasEdited", "true"); // Set flag in local storage

        }
    };

    const handlePathFileChange = (type, event) => {
        const file = event.target.files[0];
        if (file) {
            const filePath = file.path;
            const updateFunction = {
                brut: setBrutFilePath,
                dark: setDarkFilePath,
                offset: setOffsetFilePath,
                flat: setFlatFilePath,
            }[type];
            const fileNameFunction = {
                brut: setBrutFileName,
                dark: setDarkFileName,
                offset: setOffsetFileName,
                flat: setFlatFileName,
            }[type];

            updateFunction(filePath);
            fileNameFunction(file.name);

            setSelectedImages(prevImages => {
                const updatedFirstImage = {
                    ...prevImages[0],
                    [`${type}Path`]: filePath
                };

                window.electron.ipcRenderer.send('update-image-field', {
                    id: updatedFirstImage.id,
                    [`${type}Path`]: filePath,
                });

                return [updatedFirstImage, ...prevImages.slice(1)];
            });
        }
    };


    // Effect for requesting and listening to sky objects from the main process
    useEffect(() => {
        const { ipcRenderer } = window.electron;
        ipcRenderer.send("get-images");

        const listeners = {

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
        // Demander les skyObject au main process
        ipcRenderer.send('get-skyobjects');
        // Écouter la réponse
        ipcRenderer.on('get-skyobjects-reply', (event, images) => {
            const receivedSkyObjects = images.map(img => img.skyObject);
            setSkyObjects(receivedSkyObjects);
        });

        for (const [event, callback] of Object.entries(listeners)) {
            ipcRenderer.on(event, callback);
        }

        return () => {
            for (const event of Object.keys(listeners)) {
                ipcRenderer.removeAllListeners(event);
            }
        };
    }, []);

    // Effect for updating the type of image being uploaded
    useEffect(() => {
        console.log("useEffect triggered", uploadingImage);

        if (uploadingImage.photoType) {
            console.log("Sending IPC message with", uploadingImage);
            window.electron.ipcRenderer.send("update-Type", { imageId: uploadingImage.id, photoType: uploadingImage.photoType });
        } else {
            console.log("uploadingImage.photoType is falsy");
        }
    }, [uploadingImage]);


    // Fonction pour gérer l'envoi des fichiers d'image à l'IPCRenderer
    const handleImageUpload = useCallback((files = selectedFiles) => {
        files.forEach(file => {
            const imagePath = file.path;
            const currentUploadingImage = {
                path: imagePath,
                name: file.name,
                date: new Date(),
                photoType: selectedType, // Utilisation de selectedType directement ici
                skyObject: tags.filter(tag => !tag.includes(',')),
                constellation: constellation,
                location: location,
                opticalTube: opticalTube,
                mount, mount,
                camera: camera,
                objectType: objectType,
                darkPath: darkPath,
                brutPath: brutPath,
                offsetPath: offsetPath,
            };

            setUploadingImage(currentUploadingImage);
            window.electron.ipcRenderer.send("image-uploaded", currentUploadingImage); // Envoie directement à l'IPC
        });
        setSelectedFiles([]); // Réinitialiser la liste des fichiers
        window.electron.ipcRenderer.send('get-skyobjects');  // Demander les skyObjects mis à jour

        setLocation(""); // Réinitialiser la valeur de location
        setConstellation(""); // Réinitialiser la valeur de constellation
        setOpticalTube(""); // Réinitialiser la valeur de opticalTube
        setMount("");
        setCamera("");
        setDarkPath("");

    }, [selectedFiles, selectedType, tags, constellation, location, opticalTube, mount, camera, objectType, darkPath, brutPath]);



    // Fonction pour déclencher un clic sur l'input de type "file"
    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Fonction pour gérer la sélection de fichiers
    const handleFileSelected = (e) => {
        // Stocker les fichiers sélectionnés
        let files = Array.from(e.target.files);

        // Compter le nombre de fichiers .tif et .fit
        const tifAndFitFileCount = files.reduce((count, file) => {
            const extension = file.name.toLowerCase().slice(-4);
            return count + (['.tif', '.fit', '.tiff', '.fits'].includes(extension) ? 1 : 0);
        }, 0);

        // Limiter le nombre de fichiers .tif et .fit à 20 si nécessaire
        if (tifAndFitFileCount > 20) {
            alert('Pour des raisons de performance, seuls 20 fichiers .tif ou .fit peuvent être importés à la fois.');

            // Garder les 20 premiers fichiers .tif et .fit et tous les autres types
            let tifAndFitFilesKept = 0;
            files = files.filter(file => {
                const extension = file.name.toLowerCase().slice(-4);
                if (['.tif', '.fit', '.tiff', '.fits'].includes(extension)) {
                    return tifAndFitFilesKept++ < 20;
                }
                return true;
            });
        }

        setSelectedFiles(files); // Mettre à jour l'état avec les fichiers sélectionnés et filtrés
        handleImageUpload(files); // Gérer directement les fichiers
    };



    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Fichier survolé au-dessus de la zone de drop");
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        console.log("Fichier(s) déposé(s)", files);
        handleFileSelected({ target: { files: files } });
    };

    // Ajout de handleDragEnter et handleDragLeave pour le feedback visuel
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Ajoutez ici le code pour changer le style visuel si nécessaire
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Rétablissez le style d'origine ici
    };

    const onSearchChange = (newSearchTerm) => {
        setSearchTerm(newSearchTerm);

    };



    return (
        <div onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            style={{ width: '100%' }}>
            <div>




                <header
                >

                    {/*// Champ de recherche pour saisir un terme */}
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Rechercher par objet, titre, lieu..."
                        value={searchTerm} // La valeur du champ est contrôlée par le prop 'searchTerm'
                        onChange={e => onSearchChange(e.target.value)} // Quand la valeur change, la fonction 'onSearchChange' est appelée avec la nouvelle valeur
                    />

                    {/*// Bouton pour importer des fichiers */}
                    <button className='secondary' onClick={handleImportClick}>
                        <Download strokeWidth={2} width={'16px'} />Importer   {/*Importer // Icône d'upload et texte "Importer" */}
                    </button>

                    {/*// Champ input caché pour le chargement des fichiers */}
                    <input
                        ref={fileInputRef} // Référence pour accéder à cet élément
                        type="file"
                        accept="image/webp, image/png, image/jpeg, .cr2, .arw, .fit, .tif, .tiff"

                        style={{ display: 'none' }} // Caché à l'utilisateur
                        onChange={handleFileSelected} // Quand un fichier est sélectionné, 'onImportClick' est appelé
                        multiple // Permet la sélection de plusieurs fichiers en même temps
                    />
                </header>
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
                            <span className={`switch-label ${viewMode === 'grid' ? 'active' : ''}`}> <Grid strokeWidth={2} width={'16px'} /> Grille</span>
                            <span className={`switch-label ${viewMode === 'list' ? 'active' : ''}`}> <List strokeWidth={2} width={'16px'} /> Liste</span>
                        </div>

                    </div>

                    <ImageDisplay
                        viewMode={viewMode}
                        sortedImages={sortedImages}
                        groupBy={groupBy}
                        getGroupKey={getGroupKey}
                        handleImageClick={handleImageClick}
                        isSelected={isSelected}
                        formatDate={formatDate}
                        setSelectedImages={setSelectedImages}

                    />

                </div>



                <DetailsPanel
                    isSelected={isSelected}
                    sortedImages={sortedImages}
                    selectedImage={selectedImages[0]}
                    handleInputChange={handleInputChange}
                    formatDate={formatDate}
                    handlePathFileChange={handlePathFileChange}
                    selectedImages={selectedImages}
                />


            </div>


            {showNotificationFirstEdit && <Notification title='Astuce' type="tips" text="Les informations sont automatiquement sauvegardées !" />}

        </div>
    );
};

export default Container;