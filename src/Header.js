// Import des bibliothèques nécessaires
import React, { useEffect, useCallback, useState } from "react";

// Import des icônes "Search" et "Upload" depuis la bibliothèque 'react-feather'
import { Search } from 'react-feather';
import { Upload } from 'react-feather';
import { Info } from 'react-feather';
import ImageThumbnail from "./ImageThumbnail";


// Définition d'un composant React nommé "Header"
const Header = ({ searchTerm, onSearchChange, onDropImageUpload }) => {
    // States et références de Header
    const fileInputRef = React.useRef(null);
    const [ImportModalOpen, setImportModalOpen] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    
    const [darkFileName, setDarkFileName] = useState('Aucun fichier choisi');
    const [darkPath, setDarkPath] = useState(''); // État pour stocker le chemin d'accès

    const [brutFileName, setBrutFileName] = useState('Aucun fichier choisi');
    const [brutPath, setBrutPath] = useState(''); // État pour stocker le chemin d'accès

    const [flatFileName, setFlatFileName] = useState('Aucun fichier choisi');
    const [flatPath, setFlatPath] = useState(''); // État pour stocker le chemin d'accès

    const [offsetFileName, setOffsetFileName] = useState('Aucun fichier choisi');
    const [offsetPath, setOffsetPath] = useState(''); // État pour stocker le chemin d'accès




    const [inputValue, setInputValue] = useState('');
    const [tags, setTags] = useState([]);

    const [file, setFile] = useState(null);


    // Location input et value
    const [constellation, setConstellation] = useState("");

    // Location input et value
    const [location, setLocation] = useState("");

    // Instrument input et value
    const [opticalTube, setOpticalTube] = useState("");

    // Mount input et value
    const [mount, setMount] = useState("");

    // Caméra input et value
    const [camera, setCamera] = useState("");

    // Object Type Doropdown
    const [objectType, setObjectType] = useState("Stars"); // Initialisation avec une valeur par défaut

    // stoicker les skyObjects
    const [skyObjects, setSkyObjects] = useState([]);

    // States de ImportModal
    const [selectedType, setSelectedType] = useState("Render"); // Initialisation avec une valeur par défaut

    const [uploadingImage, setUploadingImage] = useState({});



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
            };

            setUploadingImage(currentUploadingImage);
            window.electron.ipcRenderer.send("image-uploaded", currentUploadingImage); // Envoie directement à l'IPC
        });
        setSelectedFiles([]); // Réinitialiser la liste des fichiers
        setShowConfirmModal(false); // Fermer la modale de confirmation
        setImportModalOpen(false); // Fermer la modale d'importation
        window.electron.ipcRenderer.send('get-skyobjects');  // Demander les skyObjects mis à jour

        setLocation(""); // Réinitialiser la valeur de location
        setConstellation(""); // Réinitialiser la valeur de constellation
        setOpticalTube(""); // Réinitialiser la valeur de opticalTube
        setMount("");
        setCamera("");
        setDarkPath("");

    }, [selectedFiles, selectedType, tags, constellation, location, opticalTube, mount, camera, objectType, darkPath, brutPath]);



    const handleClose = () => {
        setImportModalOpen(false);
        setTags([]); // Réinitialiser l'état des tags

    };

    // Fonction pour déclencher un clic sur l'input de type "file"
    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Fonction pour gérer la sélection de fichiers
    const handleFileSelected = (e) => {
        const files = Array.from(e.target.files); // Stocker les fichiers sélectionnés
        setSelectedFiles(files); // Mettre à jour l'état avec les fichiers sélectionnés
        handleImageUpload(files); // Gérer directement les fichiers sans ouvrir la modale
    };

    const handleAddTag = (e) => {
        // Si c'est un événement de touche, et que la touche n'est ni 'Enter' ni ',', on sort de la fonction
        if (e.key && e.key !== 'Enter' && e.key !== ',') return;

        // Si c'est un événement de touche, on empêche l'action par défaut
        if (e.preventDefault) {
            e.preventDefault(); // Empêcher la virgule d'être ajoutée à l'input
        }

        const newTag = e.target.value.trim().toLowerCase();;
        if (newTag && !tags.includes(newTag)) {
            setTags(prevTags => [...prevTags, newTag]);
            setInputValue('');
        }
    }

    const handleRemoveTag = (tagToRemove) => {
        setTags(prevTags => prevTags.filter(tag => tag !== tagToRemove));
    };


    const handleDarkFileChange = (e) => {
        const selectedFile = e.target.files[0]; // récupérer le fichier sélectionné
        if (selectedFile) {
            setFile(selectedFile);
            setDarkPath(e.target.value); // stocker le chemin d'accès du fichier
            setDarkFileName(selectedFile.name); // mettre à jour le nom du fichier "dark"
        } else {
            setDarkFileName('Aucun fichier choisi');
        }
    };

    const handleBrutFileChange = (e) => {
        const selectedFile = e.target.files[0]; // récupérer le fichier sélectionné
        if (selectedFile) {
            setFile(selectedFile);
            setBrutPath(e.target.value); // stocker le chemin d'accès du fichier
            setBrutFileName(selectedFile.name); // mettre à jour le nom du fichier "dark"
        } else {
            setBrutFileName('Aucun fichier choisi');
        }
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
                <Upload strokeWidth={2} width={'16px'} />Importer   {/*Importer // Icône d'upload et texte "Importer" */}
            </button>

            {/*// Champ input caché pour le chargement des fichiers */}
            <input
                ref={fileInputRef} // Référence pour accéder à cet élément
                type="file" 
                accept="image/png, image/jpeg, image/raw, image/tiff" 
                style={{ display: 'none' }} // Caché à l'utilisateur
                onChange={handleFileSelected} // Quand un fichier est sélectionné, 'onImportClick' est appelé
                multiple // Permet la sélection de plusieurs fichiers en même temps
            />


            {ImportModalOpen && (
                <>
                    <div className="overlay" ></div>
                    <div className="modal-import"  >
                        <h1>Importation de {selectedFiles.length} photo(s)</h1>

                        <div style={{ maxHeight: '30vh', overflow: 'auto', backgroundColor: '#000000', padding: '1em', borderRadius: '6px', minHeight: '6em', display: 'flex', justifyContent: 'center' }}>
                            {selectedFiles.map(file => (
                                <ImageThumbnail key={file.name} file={file} />
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '40px' }} >
                            <div style={{ display: 'flex', gap: '16px', flexDirection: 'column', width: '100%' }}  >

                                {tags && tags.length > 0 && (
                                    <div>
                                        <p>Objets sélectionnés</p>
                                        {tags.map(tag => (
                                            <span key={tag} className="tag">
                                                {tag.replace(/,/g, ' ')}
                                                <button style={{ fontSize: '12px' }} className="tertiaire" onClick={() => handleRemoveTag(tag)}>❌</button>
                                            </span>
                                        ))}
                                    </div>
                                )}


                                <h2>Informations d’observation</h2>

                                <div style={{ display: 'flex', gap: '16px' }} >

                                    <div style={{ width: '100%' }} >
                                        <p>Sélectionnez type d’objet</p>
                                        <select style={{ width: '100%' }} onChange={e => setObjectType(e.target.value)}>
                                            <option disabled='true' value="">Type d'objet</option>
                                            <option value="Stars">Stars</option>
                                            <option value="Planets">Planets</option>
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




                                    <div style={{ width: '100%' }} >
                                        <div>
                                            <p>Ajouter un/des objet(s)</p>
                                            <div style={{ display: 'flex', gap: '8px' }} >
                                                <input
                                                    style={{ width: '100%' }}
                                                    value={inputValue}
                                                    onChange={e => {
                                                        const value = e.target.value;
                                                        setInputValue(value);
                                                    }}
                                                    onKeyDown={handleAddTag}
                                                    placeholder="Saturne, M17, Lune..."
                                                />

                                                {/* Ajout du bouton "Valider" */}
                                                <button className="secondary"
                                                    onClick={() => {
                                                        if (inputValue.trim()) {
                                                            handleAddTag({ key: 'Enter', target: { value: inputValue } });
                                                        }
                                                    }}
                                                >
                                                    Ajouter
                                                </button>
                                            </div>

                                        </div>


                                        {/* Suggestions basées sur la valeur actuelle de inputValue */}
                                        {inputValue && Array.from(new Set(skyObjects.flat())).filter(skyObject => skyObject.includes(inputValue)).length > 0 && (
                                            <div className="suggestions">
                                                <p style={{ fontSize: '14px', fontWeight: '300', marginTop: '0', marginBottom: '16px' }}>Suggestions d'objet déjà ajouté</p>
                                                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }} >
                                                    {Array.from(new Set(
                                                        skyObjects.map(skyObjectString => skyObjectString.split(', ')).flat()
                                                    ))
                                                        .filter(skyObject => skyObject.includes(inputValue))
                                                        .map((suggestedSkyObject, index) => (
                                                            <div
                                                                key={index}
                                                                className="tag"
                                                                onClick={() => {
                                                                    setTags(prevTags => [...prevTags, suggestedSkyObject]);
                                                                    setInputValue('');  // Réinitialiser la valeur d'entrée après l'ajout
                                                                }}
                                                            >
                                                                {suggestedSkyObject}
                                                            </div>
                                                        ))}
                                                </div>

                                            </div>
                                        )}
                                    </div>


                                </div>


                                <div>
                                    <p>Constellation</p>
                                    <input
                                        type="text"
                                        style={{ width: '100%' }}
                                        value={constellation}
                                        onChange={e => setConstellation(e.target.value)}
                                        placeholder=""
                                    />

                                </div>


                                <div>
                                    <p>Lieu d'observation</p>
                                    <input
                                        type="text"
                                        value={location}
                                        style={{ width: '100%' }}
                                        onChange={e => setLocation(e.target.value)}
                                        placeholder=""
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '16px' }} >
                                    <div style={{ width: '100%' }} >
                                        <p>Tupe optique</p>
                                        <input
                                            type="text"
                                            value={opticalTube}
                                            style={{ width: '100%' }}
                                            onChange={e => setOpticalTube(e.target.value)}
                                            placeholder=""
                                        />
                                    </div>

                                    <div style={{ width: '100%' }} >
                                        <p>Monture</p>
                                        <input
                                            type="text"
                                            value={mount}
                                            style={{ width: '100%' }}
                                            onChange={e => setMount(e.target.value)}
                                            placeholder=""
                                        />
                                    </div>
                                </div>

                                <div style={{ width: '100%' }} >
                                    <p>Caméra</p>
                                    <input
                                        type="text"
                                        value={camera}
                                        style={{ width: '100%' }}
                                        onChange={e => setCamera(e.target.value)}
                                        placeholder=""
                                    />
                                </div>


                            </div>





                            <div style={{ display: 'flex', gap: '16px', flexDirection: 'column', width: '100%' }} >

                                <h2>Caractéristiques photo</h2>

                                <div>
                                    <p>Sélectionnez type de fichier</p>
                                    <select style={{ width: '100%' }} value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                                        <option disabled='true' value="">Type de fichier</option>
                                        <option value="Render">Rendu</option>
                                        <option value="Brut">Brut</option>
                                        <option value="Dark">Dark</option>
                                        <option value="Flat">Flat</option>
                                        <option value="Offset">Offset</option>
                                        <option value="Dessin">Dessin</option>
                                    </select>
                                </div>


                                {selectedType === "Render" && (
                                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }} >


                                        <p style={{ margin: '0' }} >Lier des DOFs à votre rendu</p>

                                        <div>
                                            <p>Brut</p>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <div className="file-upload-container">
                                                    <span className="file-name">{brutFileName}</span>
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
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <div className="file-upload-container">
                                                    <span className="file-name">{darkFileName}</span>
                                                    <label className="file-upload-btn">
                                                        Sélectionner...
                                                        <input
                                                            className="upload"
                                                            type="file"
                                                            onChange={handleDarkFileChange}
                                                            style={{ display: 'none' }}  // Cache le véritable input
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>



                                        <div>
                                            <p>Offset</p>
                                            <div style={{ display: 'flex', gap: '8px' }} >

                                            </div>
                                        </div>

                                        <div>
                                            <p>Flat</p>
                                            <div style={{ display: 'flex', gap: '8px' }} >

                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>







                        <div className="bar-btn-import" >
                            <button className="secondary" onClick={() => { handleClose(); }}>Annuler</button>
                            <button className="primary" onClick={() => { handleImageUpload(); handleClose(); }}>Confirmer Importation</button>
                        </div>
                    </div>
                </>
            )}
        </header>
    );
}

// Export du composant pour être utilisé ailleurs dans l'application
export default Header;
