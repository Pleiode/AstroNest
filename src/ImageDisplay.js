import React, { useEffect, useCallback, useState } from "react";
import { CSSTransition } from 'react-transition-group';
import Header from './Header';


const ImageDisplayAndUploader = () => {
    const [images, setImages] = useState([]);
    const [skyObjectModalOpen, setSkyObjectModalOpen] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState({});
    const [uploadingImage, setUploadingImage] = useState({});
    const [sortOrder, setSortOrder] = useState('date-asc');
    const [objectSort, setObjectSort] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');



    useEffect(() => {
        setSortOrder(objectSort === 'all' ? 'date-asc' : 'skyObject');
    }, [objectSort]);


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

    const onDrop = useCallback((e) => {
        e.preventDefault();

        Array.from(e.dataTransfer.files).forEach(file => {
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
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const imagePath = file.path;
            const currentUploadingImage = {
                path: imagePath,
                name: file.name,
                date: new Date()
            };

            setUploadingImage(currentUploadingImage); // Cette fonction pourrait avoir besoin d'être modifiée pour gérer plusieurs images
            window.electron.ipcRenderer.send("image-uploaded", imagePath);
        });

        // Si vous voulez afficher le modal après avoir importé plusieurs images, vous pouvez déplacer cette ligne en dehors de la boucle forEach
        setSkyObjectModalOpen(true);
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
        return (
            <CSSTransition in={isOpen} timeout={300} classNames="modal" unmountOnExit onExited={onClose}>
                <div className="image-modal" onClick={onClose}>
                    {image && <img src={image.path} alt={image.name} className="selected-image" />}

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


    return (
        <div>
            <div >

                {/* Barre de recherche */}
                <Header
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onImportClick={handleFileSelected}
                />
            </div>

            <div className="container" onDrop={onDrop} onDragOver={e => e.preventDefault()}>
                <div style={{ display: 'flex', gap: '8px' }} >
                    <label>

                        <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                            <option value="" disabled>Date</option>
                            <option value="date-desc">Plus récente</option>
                            <option value="date-asc">Plus ancienne</option>
                        </select>
                    </label>
                    <label>

                        <select value={objectSort} onChange={e => setObjectSort(e.target.value)}>

                            <option value="all">Objet</option>
                            <option value="Planet">Planète</option>
                            <option value="Star">Étoile</option>
                        </select>
                    </label>
                </div>



                <ImageModal isOpen={isModalOpen} image={selectedImage} onClose={handleImageActions.close} />



                <SkyObjectModal isOpen={skyObjectModalOpen} onClose={() => setSkyObjectModalOpen(false)} />
                {Object.entries(groupBy(sortedImages(), getGroupKey)).map(([key, imgs]) => (
                    <div key={key} style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '500' }}>{key}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'left' }}>
                            {imgs.map(image => (
                                <div key={image.id} className="image-container">
                                    <img src={image.path} alt={image.name} onClick={() => handleImageActions.click(image)} style={{ ...fadeIn, height: "200px", width: 'auto' }} />
                                    <div className="image-actions">
                                        <button onClick={() => handleDelete(image.id)}>Supprimer</button>
                                    </div>
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