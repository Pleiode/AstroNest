const electron = require('electron');
const { app, BrowserWindow, ipcMain, remote, dialog } = electron;

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const exifParser = require('exif-parser');
const { spawn } = require('child_process');



// Obtient le chemin du dossier de données de l'utilisateur
const userDataPath = electron.app.getPath('userData');

// Définit le chemin complet de votre base de données
const dbPath = path.join(__dirname, 'Database.db');
console.log("Database path:", dbPath);

let win;
let db;


if (process.env.NODE_ENV === 'production') {
    if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
        for (let [key, value] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
            window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = typeof value === 'function' ? () => { } : null;
        }
    }
}



function createWindow() {
    // Crée une nouvelle fenêtre du navigateur Electron
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800, // Largeur minimale de la fenêtre
        minHeight: 600,
        titleBarStyle: 'hidden',
        titleBarOverlay: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true, // Protège contre les attaques XSS
            preload: path.join(__dirname, 'preload.js') // Utilise un script de préchargement
        },
    });

    // Charge le fichier HTML principal dans la fenêtre
    win.loadFile('dist/index.html');

    // Crée la base de données lors du lancement de l'application
    createDatabase();

    // Gestionnaires d'événements pour les actions de fenêtre (minimiser, maximiser, fermer)
    ipcMain.on('minimize-window', () => {
        if (win) {
            win.minimize();
        }
    });

    ipcMain.on('maximize-window', () => {
        if (win) {
            if (win.isMaximized()) {
                win.restore();
            } else {
                win.maximize();
            }
        }
    });

    ipcMain.on('close-window', () => {
        if (win) {
            win.close();
        }
    });


    // Gestionnaire d'événements pour l'événement "image-uploaded" envoyé depuis le processus de rendu
    // Gestionnaire d'événements pour l'événement "image-uploaded" envoyé depuis le processus de rendu
    ipcMain.on("image-uploaded", (event, currentUploadingImage) => {
        // Destructuration de l'objet pour extraire les propriétés nécessaires
        const { path: imagePath, name: imageName, date, photoType, skyObject, constellation, location, opticalTube, mount, camera, objectType, darkPath, brutPath } = currentUploadingImage;

        // Convertissez le tableau des tags "skyObject" en une chaîne pour le stockage
        const skyObjectString = skyObject.join(', ');

        // Initialisation de la variable shotDate avec la date actuelle
        let shotDate = new Date().toISOString();
        // Déclaration de l'objet exifData pour stocker les données EXIF
        let exifData = {};

        const fileExtension = path.extname(imagePath).toLowerCase();

        // Si l'extension du fichier est .jpeg ou .jpg, tente de lire les métadonnées EXIF
        if (fileExtension === '.jpeg' || fileExtension === '.jpg') {
            try {
                // Lit les métadonnées EXIF du fichier
                const buffer = fs.readFileSync(imagePath);
                const parser = exifParser.create(buffer);
                const result = parser.parse();

                // Traitement des données EXIF et stockage dans l'objet exifData
                if (result && result.tags) {
                    // Ici, vous pouvez ajouter les données EXIF que vous voulez enregistrer, par exemple:
                    exifData.camera = result.tags.Model; // modèle de la caméra
                    exifData.exposure = result.tags.ExposureTime; // temps d'exposition
                    exifData.resolution = `${result.tags.ImageWidth}x${result.tags.ImageHeight}`; // résolution de l'image


                    // Gestion de la date de prise de vue
                    if (result.tags.DateTimeOriginal) {
                        // Convertit la date EXIF en format ISO si possible
                        shotDate = new Date(result.tags.DateTimeOriginal * 1000).toISOString();
                    }
                }

                console.log("Raw EXIF :", result.tags);
            } catch (error) {
                console.error("Erreur lors de la lecture des métadonnées EXIF:", error);
            }
        }

        // Insère les données de l'image et les données EXIF dans la base de données
        db.run(`INSERT INTO images(name, path, date, photoType, skyObject, constellation, location, opticalTube, mount, camera, objectType, darkPath, brutPath) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [imageName, imagePath, shotDate, photoType, skyObjectString, constellation, location, opticalTube, mount, exifData.camera, objectType, darkPath, brutPath], function (err) {
            if (err) {
                return console.error(err.message);
            }
            console.log(`A row has been inserted with rowid ${this.lastID}`);
            // Informe le processus de rendu qu'une nouvelle image a été ajoutée
            event.reply("image-added", this.lastID);
        });
    });






    // Gestionnaire d'événements pour l'événement "get-images" envoyé depuis le processus de rendu
    ipcMain.on("get-images", (event) => {
        // Sélectionne toutes les images de la base de données triées par date décroissante
        db.all(`SELECT * FROM images ORDER BY date DESC`, [], (err, rows) => {
            if (err) {
                throw err;
            }
            // Envoie les données des images au processus de rendu
            event.reply("get-images-reply", rows);
        });
    });

    // Gestionnaire d'événements pour l'événement "delete-image" envoyé depuis le processus de rendu
    ipcMain.on("delete-image", (event, id) => {
        // Supprime l'image avec l'ID spécifié de la base de données
        db.run(`DELETE FROM images WHERE id = ?`, id, (err) => {
            if (err) {
                return console.log(err.message);
            }
            console.log(`Row(s) deleted ${this.changes}`);
            // Envoie une confirmation que l'image a été supprimée
            event.reply("image-deleted", id);
        });
    });
}

// Écoute l'événement "ready" de l'application et crée la fenêtre lorsqu'elle est prête
app.whenReady().then(createWindow);


// Fonction pour créer la base de données s'il n'existe pas
function createDatabase() {
    // Ouvre la base de données ou la crée si elle n'existe pas
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error("Error opening database:", err);
            return;
        }
    });

    // Crée la table "images" si elle n'existe pas déjà
    db.run(`CREATE TABLE IF NOT EXISTS images(
        id INTEGER PRIMARY KEY,
        name TEXT,
        path TEXT,
        skyObject TEXT,
        objectType TEXT,
        constellation TEXT,
        AD TEXT,
        DEC TEXT,
        date TEXT,
        location TEXT,
        photoType TEXT,
        resolution TEXT,
        size REAL,
        instrument TEXT,
        opticalTube TEXT,
        mount TEXT,
        camera TEXT,
        exposition TEXT,
        darkPath TEXT,
        flatPath TEXT,
        brutPath TEXT,
        offsetPath TEXT,
        note TEXT
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });
}

// Gestionnaire d'événements pour l'événement "update-Type" envoyé depuis le processus de rendu
ipcMain.on("update-Type", (event, { imageId, photoType }) => {
    // Met à jour le champ "photoType" de l'image avec l'ID spécifié dans la base de données
    db.run(`UPDATE images SET photoType = ? WHERE id = ?`, [photoType, imageId], function (err) {
        if (err) {
            console.error("Error updating image:", err.message);
            // Envoie une réponse à l'événement "update-Type-reply" avec le statut de mise à jour
            event.reply("update-Type-reply", { success: false });
            return;
        }
        console.log(`Updated photoType for image with id ${imageId}`);
        // Envoie une réponse à l'événement "update-Type-reply" avec le statut de mise à jour
        event.reply("update-Type-reply", { success: true });
    });
});


// Gestionnaire d'événements pour l'événement "update-image-info" envoyé depuis le processus de rendu
ipcMain.on("update-image-info", (event, updatedImage) => {
    // Extrait l'ID et les champs mis à jour de l'objet d'image
    const { id, ...fields } = updatedImage;
    const queryParams = Object.values(fields);
    // Crée la chaîne de requête pour la mise à jour des champs de l'image
    const queryFields = Object.keys(fields).map(field => `${field} = ?`).join(', ');

    // Met à jour les champs de l'image avec l'ID spécifié dans la base de données
    db.run(`UPDATE images SET ${queryFields} WHERE id = ?`, [...queryParams, id], function (err) {
        if (err) {
            console.error("Error updating image:", err.message);
            // Envoie une réponse à l'événement "update-image-info-reply" avec le statut de mise à jour
            event.reply("update-image-info-reply", { success: false });
            return;
        }
        console.log(`Updated info for image with id ${id}`);
        // Envoie une réponse à l'événement "update-image-info-reply" avec le statut de mise à jour
        event.reply("update-image-info-reply", { success: true });
    });
});

// ... Vos autres imports et initialisations ...

// Ajoutez une nouvelle écoute pour l'événement "get-skyobjects"
ipcMain.on('get-skyobjects', (event) => {
    db.all('SELECT skyObject FROM images', [], (err, rows) => {
        if (err) {
            console.error(err.message);
            event.reply('get-skyobjects-reply', []);
        } else {
            event.reply('get-skyobjects-reply', rows);
        }
    });
});



ipcMain.on('update-image-field', (event, updatedField) => {
    // Utilisez la décomposition pour obtenir l'ID et les autres champs
    const { id, ...fields } = updatedField;

    // Parcourir les champs pour mettre à jour (il peut y avoir plus d'un champ)
    Object.entries(fields).forEach(([field, value]) => {
        const sql = `UPDATE images SET ${field} = ? WHERE id = ?`;

        db.run(sql, [value, id], function (err) {
            if (err) {
                event.reply('update-image-field-response', { success: false, error: err.message });
                return console.error(err.message);
            }
            // 'this.changes' contient le nombre de lignes affectées
            event.reply('update-image-field-response', { success: true, changes: this.changes });
        });
    });
});




ipcMain.on('export-db-to-json', (event) => {
    console.log("Reçu export-db-to-json");

    // Sélectionnez toutes les données de la table images
    db.all('SELECT * FROM images', [], (err, rows) => {
        if (err) {
            console.error("Erreur lors de la récupération des données:", err.message);
            event.reply('export-db-to-json-reply', { success: false, message: 'Erreur lors de la récupération des données.' });
            return;
        }

        // Convertissez les données en chaîne JSON
        const jsonData = JSON.stringify(rows, null, 2);

        // Afficher la boîte de dialogue pour choisir l'emplacement
        dialog.showSaveDialog({
            title: "Sauvegarder le JSON",
            defaultPath: "database_export.json",
            filters: [{ name: "JSON Files", extensions: ["json"] }]
        }).then(result => {
            if (result.canceled) {
                return;
            }

            const jsonFilePath = result.filePath;

            // Écrivez les données dans le fichier JSON
            fs.writeFile(jsonFilePath, jsonData, (err) => {
                if (err) {
                    console.error("Erreur lors de l'écriture du fichier JSON:", err.message);
                    event.reply('export-db-to-json-reply', { success: false, message: "Erreur lors de l'écriture du fichier JSON." });
                    return;
                }

                // Si tout s'est bien passé, envoyez une réponse réussie
                event.reply('export-db-to-json-reply', { success: true, message: 'Exportation réussie!', path: jsonFilePath });
            });
        });
    });
});

