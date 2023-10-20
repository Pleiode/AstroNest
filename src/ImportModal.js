import React, { useState, useEffect } from "react";
import { CSSTransition } from 'react-transition-group';

const ImportModal = ({ isOpen, onClose }) => {
    // State pour stocker le type d'image sélectionné et l'image en cours de téléchargement
    const [selectedType, setSelectedType] = useState("");
    const [uploadingImage, setUploadingImage] = useState({});

    // Effet de montage pour initialiser les écouteurs IPC Renderer
    useEffect(() => {
        const { ipcRenderer } = window.electron;
        // Envoie une requête pour récupérer les images au composant principal
        ipcRenderer.send("get-images");

        // Écoute les événements IPC Renderer
        const listeners = {
            // Événement déclenché lorsqu'une nouvelle image est ajoutée
            "image-added": (_, imageId) => {
                setUploadingImage(prev => ({ ...prev, id: imageId }));
                // Demande au composant principal de récupérer les images à jour
                ipcRenderer.send("get-images");
            },
            // Événement de réponse lorsqu'une mise à jour d'objet céleste est effectuée
            "update-skyObject-reply": (_, data) => {
                if (data.success) {
                    // Met à jour localement les images avec le nouvel objet céleste
                    setImages(prevImages => {
                        const updatedImages = prevImages.map(img =>
                            img.id === uploadingImage.id ? { ...img, skyObject: uploadingImage.skyObject } : img
                        );
                        // Sélectionne l'image mise à jour
                        setSelectedImage(updatedImages.find(img => img.id === uploadingImage.id));
                        return updatedImages;
                    });
                }
            }
        };

        // Enregistre les écouteurs IPC Renderer
        for (const [event, callback] of Object.entries(listeners)) {
            ipcRenderer.on(event, callback);
        }

        // Effet de démontage pour nettoyer les écouteurs IPC Renderer
        return () => {
            for (const event of Object.keys(listeners)) {
                ipcRenderer.removeAllListeners(event);
            }
        };
    }, []); // Utilisation d'un tableau de dépendances vide pour que cet effet soit exécuté une fois après le rendu initial

    // Gère la confirmation de l'association de l'image avec un objet céleste
    const handleConfirm = () => {
        if (uploadingImage && selectedType) {
            // Met à jour le type de l'image en cours de téléchargement
            setUploadingImage(prev => ({ ...prev, photoType: selectedType }));
            // Envoie une demande de mise à jour du type d'image au composant principal
            window.electron.ipcRenderer.send("update-Type", { imageId: uploadingImage.id, photoType: selectedType });
            // Ferme la modal
            onClose();
        }
    };

    // Rendu de la modal d'importation
    return (
        <CSSTransition in={isOpen} timeout={300} classNames="modal" unmountOnExit onExited={onClose}>
            <div>
                <h2>Associer à un objet céleste</h2>
                {/* Menu déroulant pour sélectionner le type d'image */}
                <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                    <option value="Render">Rendu</option>
                    <option value="Brut">Brut</option>
                    <option value="Dark">Dark</option>
                    <option value="Flat">Flat</option>
                    <option value="Offset">Offset</option>
                </select>
                {/* Bouton pour confirmer l'association */}
                <button onClick={handleConfirm}>Confirmer</button>
                {/* Bouton pour annuler l'opération */}
                <button onClick={onClose}>Annuler</button>
            </div>
        </CSSTransition>
    );
};

// Exporte le composant ImportModal
export default ImportModal;
