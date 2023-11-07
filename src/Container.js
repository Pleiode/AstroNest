import React, { useEffect, useState } from "react";
import Header from './Header';
import { Grid, List } from 'react-feather';
import ImageModal from './ImageModal';
import DetailsPanel from "./DetailsPanel";
import ImageDisplay from "./ImageDisplay";

const Container = () => {
    const [images, setImages] = useState([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState({});
    const [sortOrder, setSortOrder] = useState('date-desc');
    const [objectSort, setObjectSort] = useState('all');
    const [TypeSort, setTypeSort] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState(localStorage.getItem('viewMode') || 'grid');
    const [showDetailsPanel, setShowDetailsPanel] = useState(true);
    const [selectedImages, setSelectedImages] = useState([]);

    // State for tracking the type of image being uploaded
    const isSelected = (image) => {
        return selectedImages.some(selected => image.id === selected.id);
    };



    /**
     * Handles the click event on an image element.
     * If the ctrl key or meta key is pressed, toggles the selection of the image.
     * Otherwise, sets the selected images to the clicked image.
     * Also shows the details panel.

     */
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
    


    const handleDelete = id => window.electron.ipcRenderer.send("delete-image", id);



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


                    <ImageDisplay
                        viewMode={viewMode}
                        sortedImages={sortedImages}
                        groupBy={groupBy}
                        getGroupKey={getGroupKey}
                        handleImageClick={handleImageClick}
                        isSelected={isSelected}
                        formatDate={formatDate}
                    />



                    <ImageModal
                        isOpen={isModalOpen}
                        image={selectedImage}
                        onClose={handleImageActions.close}
                        loadImageToCanvas={(src, img, cb) => loadImageToCanvas(src, img, cb, viewMode)}
                    />
                </div>



                <DetailsPanel
                    selectedImage={selectedImages[0]}
                    handleDelete={handleDelete}
                    handleInputChange={handleInputChange}
                    formatDate={formatDate}
                    handleBrutFileChange={handleBrutFileChange}
                    selectedImages={selectedImages}
                />


            </div>
        </div>
    );
};

export default Container;