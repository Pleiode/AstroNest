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

    const [inputValue, setInputValue] = useState('');
    const [tags, setTags] = useState([]);

    const [constellationInputValue, setConstellationInputValue] = useState('');
    const [constellation, setConstellations] = useState([]);



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
                constellation: constellation
            };

            setUploadingImage(currentUploadingImage);
            window.electron.ipcRenderer.send("image-uploaded", currentUploadingImage); // Envoie directement à l'IPC
        });
        setSelectedFiles([]); // Réinitialiser la liste des fichiers
        setShowConfirmModal(false); // Fermer la modale de confirmation
        setImportModalOpen(false); // Fermer la modale d'importation
        window.electron.ipcRenderer.send('get-skyobjects');  // Demander les skyObjects mis à jour

    }, [selectedFiles, selectedType, tags, constellation]);


    const handleConfirm = () => {
        handleImageUpload(); // Appeler simplement handleImageUpload 
    };



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
        setSelectedFiles(Array.from(e.target.files)); // Stocker les fichiers sélectionnés
        setImportModalOpen(true); // Afficher la modale de confirmation
    };


    const handleAddTag = (e) => {
        // Si c'est un événement de touche, et que la touche n'est ni 'Enter' ni ',', on sort de la fonction
        if (e.key && e.key !== 'Enter' && e.key !== ',') return;

        // Si c'est un événement de touche, on empêche l'action par défaut
        if (e.preventDefault) {
            e.preventDefault(); // Empêcher la virgule d'être ajoutée à l'input
        }

        const newTag = e.target.value.trim();
        if (newTag && !tags.includes(newTag)) {
            setTags(prevTags => [...prevTags, newTag]);
            setInputValue('');
        }
    }

    const handleRemoveTag = (tagToRemove) => {
        setTags(prevTags => prevTags.filter(tag => tag !== tagToRemove));
    };




    const handleAddConstellation = (e) => {
        if (e.key && e.key !== 'Enter') return;

        const newConstellation = e.target.value.trim().toUpperCase();
        if (newConstellation && !constellation.includes(newConstellation)) {
            setConstellations(prevConstellations => [...prevConstellations, newConstellation]);
            setConstellationInputValue('');
        }
    }




    // Rendu du composant
    return (
        <header>
            {/*// Champ de recherche pour saisir un terme */}
            <input
                type="text"
                className="search-input"
                placeholder="Rechercher par titre, objet"
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
                accept="image/*" // Accepte uniquement les images
                style={{ display: 'none' }} // Caché à l'utilisateur
                onChange={handleFileSelected} // Quand un fichier est sélectionné, 'onImportClick' est appelé
                multiple // Permet la sélection de plusieurs fichiers en même temps
            />



            {ImportModalOpen && (
                <>
                    <div className="overlay" ></div>
                    <div className="modal-import"  >
                        <h1>Importation de {selectedFiles.length} photo(s)</h1>

                        <div style={{ maxHeight: '30vh', overflow: 'auto', backgroundColor: 'var(--bg-color)', padding: '1em', borderRadius: '6px', minHeight: '6em', display:'flex', justifyContent:'center' }}>
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



                                <div style={{ display: 'flex', gap: '16px' }} >


                                    <div style={{ width: '100%' }} >
                                        <p>Sélectionnez type d’objet</p>
                                        <select style={{ width: '100%' }} onChange={e => setSelectedType(e.target.value)}>
                                            <option disabled='true' value="">Type dd'objet</option>
                                            <option value="Render">Planéte</option>
                                            <option value="Brut">Amas</option>
                                            <option value="Dark">Nébuleuse</option>
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
                                                        const value = e.target.value.toUpperCase();
                                                        setInputValue(value);
                                                    }}
                                                    onKeyDown={handleAddTag}
                                                    className="uppercase"
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
                                        style={{ width: '100%' }}
                                        value={constellationInputValue}    
                                        onChange={e => setConstellationInputValue(e.target.value.toUpperCase())}
                                        onKeyDown={handleAddConstellation}
                                        placeholder="Orion, Ursa Major..."
                                    />
                                </div>


                                <div>

                                    <p>Lieu d'observation</p>
                                    <input
                                        style={{ width: '100%' }}
                                        onChange={e => {
                                            const value = e.target.value.toUpperCase();
                                            setInputValue(value);
                                        }}

                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '16px' }} >

                                    <div style={{ width: '100%' }} >
                                        <p>Instrument</p>
                                        <input
                                            style={{ width: '100%' }}
                                            onChange={e => {
                                                const value = e.target.value.toUpperCase();
                                                setInputValue(value);
                                            }}
                                        />
                                    </div>

                                    <div style={{ width: '100%' }} >
                                        <p>Caméra</p>
                                        <input
                                            style={{ width: '100%' }}
                                            onChange={e => {
                                                const value = e.target.value.toUpperCase();
                                                setInputValue(value);
                                            }}
                                        />
                                    </div>


                                </div>




                            </div>

                            <div style={{ width: '100%' }} >

                                <div>
                                    <p>Sélectionnez type de photo</p>
                                    <select style={{ width: '100%' }} value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                                        <option disabled='true' value="">Type de photo</option>
                                        <option value="Render">Rendu</option>
                                        <option value="Brut">Brut</option>
                                        <option value="Dark">Dark</option>
                                        <option value="Flat">Flat</option>
                                        <option value="Offset">Offset</option>
                                    </select>
                                </div>


                                {selectedType === "Render" && (
                                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }} >

                                        <div className="info" >
                                            <Info stroke="#88B2FF" strokeWidth={2} width={'16px'} />
                                            <p>Importez d’abord vos Brut, Dark, Offset et Flat avant de les sélectionner.</p>
                                        </div>

                                        <p style={{ margin: '0' }} >Lier des DOFs à votre rendu</p>

                                        <div>
                                            <p>Brut</p>
                                            <div style={{ display: 'flex', gap: '8px' }} >
                                                <input
                                                    style={{ width: '100%' }}
                                                    value={inputValue}
                                                    onChange={e => {
                                                        const value = e.target.value.toUpperCase();
                                                        setInputValue(value);
                                                    }}
                                                    onKeyDown={handleAddTag}
                                                    className="uppercase"

                                                />

                                                {/* Ajout du bouton "Valider" */}
                                                <button className="secondary"
                                                    onClick={() => {
                                                        if (inputValue.trim()) {
                                                            handleAddTag({ key: 'Enter', target: { value: inputValue } });
                                                        }
                                                    }}
                                                >
                                                    Sélectionner
                                                </button>
                                            </div>
                                        </div>


                                        <div>
                                            <p>Dark</p>
                                            <div style={{ display: 'flex', gap: '8px' }} >
                                                <input
                                                    style={{ width: '100%' }}
                                                    value={inputValue}
                                                    onChange={e => {
                                                        const value = e.target.value.toUpperCase();
                                                        setInputValue(value);
                                                    }}
                                                    onKeyDown={handleAddTag}
                                                    className="uppercase"

                                                />

                                                {/* Ajout du bouton "Valider" */}
                                                <button className="secondary"
                                                    onClick={() => {
                                                        if (inputValue.trim()) {
                                                            handleAddTag({ key: 'Enter', target: { value: inputValue } });
                                                        }
                                                    }}
                                                >
                                                    Sélectionner
                                                </button>
                                            </div>
                                        </div>


                                        <div>
                                            <p>Offset</p>
                                            <div style={{ display: 'flex', gap: '8px' }} >
                                                <input
                                                    style={{ width: '100%' }}
                                                    value={inputValue}
                                                    onChange={e => {
                                                        const value = e.target.value.toUpperCase();
                                                        setInputValue(value);
                                                    }}
                                                    onKeyDown={handleAddTag}
                                                    className="uppercase"

                                                />

                                                {/* Ajout du bouton "Valider" */}
                                                <button className="secondary"
                                                    onClick={() => {
                                                        if (inputValue.trim()) {
                                                            handleAddTag({ key: 'Enter', target: { value: inputValue } });
                                                        }
                                                    }}
                                                >
                                                    Sélectionner
                                                </button>
                                            </div>

                                        </div>

                                        <div>
                                            <p>Flat</p>
                                            <div style={{ display: 'flex', gap: '8px' }} >
                                                <input
                                                    style={{ width: '100%' }}
                                                    value={inputValue}
                                                    onChange={e => {
                                                        const value = e.target.value.toUpperCase();
                                                        setInputValue(value);
                                                    }}
                                                    onKeyDown={handleAddTag}
                                                    className="uppercase"

                                                />

                                                {/* Ajout du bouton "Valider" */}
                                                <button className="secondary"
                                                    onClick={() => {
                                                        if (inputValue.trim()) {
                                                            handleAddTag({ key: 'Enter', target: { value: inputValue } });
                                                        }
                                                    }}
                                                >
                                                    Sélectionner
                                                </button>
                                            </div>

                                        </div>



                                    </div>
                                )}
                            </div>
                        </div>







                        <div className="bar-btn-import" >
                            <button className="secondary" onClick={() => { handleClose(); }}>Annuler</button>
                            <button className="primary" onClick={() => { handleConfirm(); handleClose(); }}>Confirmer Importation</button>
                        </div>
                    </div>
                </>
            )}
        </header>
    );
}

// Export du composant pour être utilisé ailleurs dans l'application
export default Header;
