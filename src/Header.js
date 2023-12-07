// Importing necessary libraries
import React, { useEffect, useCallback, useState, useRef } from "react";

// Importing "Upload" icon from 'react-feather' library
import { Upload, Download } from 'react-feather';

// Header component definition
const Header = ({ searchTerm, onSearchChange, onDropImageUpload }) => {
    // State and ref declarations for the Header component
    const fileInputRef = useRef(null);

    // States for handling the visibility of modals
    const [ImportModalOpen, setImportModalOpen] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // States for file management
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [file, setFile] = useState(null);

    // States for handling file information
    const [darkFileName, setDarkFileName] = useState('No file selected');
    const [darkPath, setDarkPath] = useState('');

    const [brutFileName, setBrutFileName] = useState('No file selected');
    const [brutPath, setBrutPath] = useState('');

    const [flatFileName, setFlatFileName] = useState('No file selected');
    const [flatPath, setFlatPath] = useState('');

    const [offsetFileName, setOffsetFileName] = useState('No file selected');
    const [offsetPath, setOffsetPath] = useState('');

    // States for form inputs
    const [inputValue, setInputValue] = useState('');
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
    const [selectedType, setSelectedType] = useState('Render');
    const [uploadingImage, setUploadingImage] = useState({});


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
        setShowConfirmModal(false); // Fermer la modale de confirmation
        setImportModalOpen(false); // Fermer la modale d'importation"
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

        // Limiter le nombre de fichiers à 20
        if (files.length > 20) {
            files = files.slice(0, 20); // Ne garder que les 20 premiers fichiers
            alert('Pour des raisons de performance, seuls 20 fichiers peuvent être importés à la fois.'); // Optionnel: Afficher un message à l'utilisateur
        }

        setSelectedFiles(files); // Mettre à jour l'état avec les fichiers sélectionnés
        handleImageUpload(files); // Gérer directement les fichiers
    };


    // Rendu du composant
    return (
        <header>
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
    );
}

// Export du composant pour être utilisé ailleurs dans l'application
export default Header;
