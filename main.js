const electron = require('electron');
const { app, BrowserWindow, ipcMain, dialog, shell } = electron;
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const exifParser = require('exif-parser');
const { exec, spawn } = require('child_process');
const os = require('os');

const https = require('https');
const packageJson = require('./package.json'); // Ajustez le chemin si nécessaire

// Obtient les chemins du dossier de données de l'utilisateur et des documents
const userDataPath = app.getPath('userData');
const userDocumentsPath = app.getPath('documents');

// [Autres parties du code...]


// Construit le chemin complet de la base de données dans ce dossier
const dbPath = path.join(userDocumentsPath, 'Database-Meridio.db');



console.log("Database path:", dbPath);

let win;
let db;


// Définissez le chemin du fichier de journalisation
const logFilePath = path.join(app.getPath('userData'), 'backend.log'); // userData est un répertoire approprié pour stocker des données d'application

console.log("Log file path:", logFilePath);

// Redirigez la sortie de la console vers le fichier de journalisation
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
console.log = (message) => {
    logStream.write(`${message}\n`);
    process.stdout.write(`${message}\n`);
};
console.error = (message) => {
    logStream.write(`ERROR: ${message}\n`);
    process.stderr.write(`ERROR: ${message}\n`);
};


// Désactivez les outils de développement pour la version de production
if (process.env.NODE_ENV === 'production') {
    if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
        for (let [key, value] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
            window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = typeof value === 'function' ? () => { } : null;
        }
    }
}



function createWindow() {
    // Détermine si l'application s'exécute sur Windows
    const isWindows = os.platform() === 'win32';

    // Crée une nouvelle fenêtre du navigateur Electron
    let windowOptions = {
        width: 1000,
        height: 650,
        minWidth: 800, // Largeur minimale de la fenêtre
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true, // Protège contre les attaques XSS
            preload: path.join(__dirname, 'preload.js') // Utilise un script de préchargement
        }
    };

    let win = new BrowserWindow(windowOptions);

    // Ajuste le style de la barre de titre pour Windows
    if (isWindows) {
        windowOptions.frame = true; // Utilise la barre de titre native de Windows
        win.setMenu(null);
    } else {
        windowOptions.titleBarStyle = 'hidden';
        windowOptions.titleBarOverlay = true;
    }



    // Charge le fichier HTML principal dans la fenêtre
    win.loadFile('dist/index.html');

    checkForUpdates();
    // Crée la base de données lors du lancement de l'application
    createDatabase();
}


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


// Gestionnaire d'événements pour l'événement "image-uploaded" envoyé depuis le processus de rendu
ipcMain.on("image-uploaded", (event, currentUploadingImage) => {
    // Destructuration de l'objet pour extraire les propriétés nécessaires
    const { path: imagePath, name: imageName, date, photoType, skyObject, constellation, location, opticalTube, mount, camera, objectType, darkPath, brutPath, offsetPath, flatPath } = currentUploadingImage;

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

                console.log("Métadonnées EXIF :", result.tags);



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
    db.run(`INSERT INTO images(name, path, date, photoType, skyObject, constellation, location, opticalTube, mount, camera, objectType, darkPath, brutPath, offsetPath, flatPath) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [imageName, imagePath, shotDate, photoType, skyObjectString, constellation, location, opticalTube, mount, exifData.camera, objectType, darkPath, brutPath, offsetPath, flatPath], function (err) {
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
        convertPath TEXT,
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


process.env.APP_ROOT_PATH = path.join(__dirname, '..');


ipcMain.on('convert-fit', (event, imagePath) => {

    const scriptName = process.env.NODE_ENV === 'development' ? 'converter.py' : 'converter'; // Nom du script avec extension pour le développement
    const scriptPath = process.env.NODE_ENV === 'development'
        ? path.join(__dirname, scriptName)
        : path.join(process.resourcesPath, './converter', scriptName);


    exec(`"${scriptPath}" "${imagePath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur de conversion: ${error}`);
            event.reply('conversion-error', error.message);
            return;
        }

        const convertedPath = stdout.trim();
        console.log(`Conversion réussie : ${convertedPath}`);

        // Mise à jour de la base de données avec le chemin de l'image convertie
        db.run(`UPDATE images SET convertPath = ? WHERE path = ?`, [convertedPath, imagePath], function (err) {
            if (err) {
                // Vous pouvez choisir de notifier l'interface utilisateur de cette erreur
                return;
            }

            // Répondre au frontend que la conversion est terminée et que la DB est mise à jour
            event.reply('conversion-done', { imagePath: imagePath, convertedPath: convertedPath });
        });
    });
});



ipcMain.on('start-blink', (event, imagePaths) => {
    const scriptPath = "blink.py";

    const pythonProcess = spawn('python3', [scriptPath, ...imagePaths]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });
});





function checkForUpdates() {
    console.log("Début de la vérification des mises à jour...");

    const options = {
        hostname: 'api.github.com',
        path: '/repos/Pleiode/Meridio/releases/latest',
        method: 'GET',
        headers: { 'User-Agent': 'Meridio' }
    };

    https.get(options, (res) => {
        console.log("Réponse reçue de l'API GitHub.");

        console.log(`Statut de la réponse HTTP: ${res.statusCode}`);

        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
            console.log("Réception des données...");
        });

        res.on('end', () => {
            console.log("Fin de la réception des données.");
            console.log("Données brutes reçues:", data);

            try {
                const releaseInfo = JSON.parse(data);
                console.log("Informations de la release analysées:", releaseInfo);


                if (releaseInfo.assets && releaseInfo.assets.length > 0) {
                    const latestVersion = releaseInfo.tag_name;
                    const downloadUrl = releaseInfo.assets[0].browser_download_url;

                    console.log("Dernière version:", latestVersion);
                    console.log("URL de téléchargement:", downloadUrl);

                    if (latestVersion !== packageJson.version) {
                        console.log("Mise à jour disponible.");
                        dialog.showMessageBox({
                            type: 'info',
                            title: 'Mise à jour disponible',
                            message: 'Une nouvelle version de l’application est disponible. Voulez-vous la télécharger et l’installer maintenant ?',
                            buttons: ['Oui', 'Plus tard']
                        }).then(result => {
                            if (result.response === 0) {
                                console.log("L'utilisateur a choisi de télécharger la mise à jour.");
                                require('electron').shell.openExternal(downloadUrl);
                            } else {
                                console.log("L'utilisateur a choisi de reporter la mise à jour.");
                            }
                        });
                    } else {
                        console.log("L'application est à jour.");
                    }
                } else {
                    console.log('Aucun asset trouvé pour la dernière version.');
                }
            } catch (e) {
                console.error("Erreur lors de l'analyse des données de l'API GitHub:", e);
            }
        });
    }).on('error', (e) => {
        console.error("Erreur lors de la requête à l'API GitHub:", e);
    });
}


// Gestionnaire d'événements pour l'événement "open-image" envoyé depuis le processus de rendu
ipcMain.on('open-fit-file', (event, imagePath) => {
    exec(`python3 open_image.py "${imagePath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur lors de l'exécution du script Python : ${error}`);
            return;
        }
        console.log(`Résultat : ${stdout}`);
    });
});


// Gestionnaire d'événements pour l'événement "open-in-finder" envoyé depuis le processus de rendu
ipcMain.on('open-in-finder', (event, filePath) => {

    shell.showItemInFolder(filePath);
});




ipcMain.on('export-image', async (event, filePath) => {
    console.log("Reçu export-image", filePath);

    try {
        const { filePath: savePath } = await dialog.showSaveDialog({
            title: 'Exporter l\'image',
            defaultPath: path.basename(filePath, path.extname(filePath)) + '.jpeg',
            filters: [{ name: 'Images', extensions: ['jpeg'] }]
        });

        if (!savePath) {
            event.reply('export-image-cancelled');
            return;
        }

        const pythonCommand = `python3 export-convert.py "${filePath}" "${savePath}"`;



        exec(pythonCommand, (error, stdout, stderr) => {
            if (error || stderr) {
                console.error('Erreur lors de l\'exportation de l\'image:', error || stderr);
                dialog.showErrorBox('Erreur d\'exportation', 'Une erreur est survenue lors de l\'exportation de l\'image.');
                event.reply('export-image-failure', error ? error.message : stderr);
                return;
            }

            console.log('Image convertie avec succès:', stdout);
            dialog.showMessageBox({
                type: 'info',
                title: 'Exportation réussie',
                message: 'L\'image a été exportée avec succès.',
            });
            event.reply('export-image-success', savePath);
        });
    } catch (error) {
        console.error('Erreur lors de l\'ouverture du dialogue de sauvegarde:', error);
        dialog.showErrorBox('Erreur de dialogue', 'Une erreur est survenue lors de l\'ouverture du dialogue de sauvegarde.');
        event.reply('export-image-failure', error.message);
    }
});



ipcMain.on('resize-window', (event, targetWidth, targetHeight) => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        let width = win.getBounds().width;
        let height = win.getBounds().height;

        const widthIncrement = (targetWidth - width) / 20; // 20 est le nombre d'étapes pour l'animation
        const heightIncrement = (targetHeight - height) / 20;

        const interval = setInterval(() => {
            width += widthIncrement;
            height += heightIncrement;

            win.setSize(Math.round(width), Math.round(height));

            if (Math.round(width) === targetWidth && Math.round(height) === targetHeight) {
                clearInterval(interval);
            }
        }, 10); // 20 ms pour chaque étape de l'animation
    }
});