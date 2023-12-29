const electron = require('electron');
const { app, BrowserWindow, ipcMain, dialog, shell } = electron;
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const exifParser = require('exif-parser');
const os = require('os');
const https = require('https');
const packageJson = require('./package.json'); // Ajustez le chemin si nécessaire
const appName = 'Eidos'; // Remplacez par le nom de votre application
const appFolderPath = path.join(os.homedir(), 'Documents', appName);
const convertedImagesPath = path.join(appFolderPath, 'convertedImage');
const thumbnailsPath = path.join(appFolderPath, 'thumbnails');

const dbPath = path.join(appFolderPath, 'Database.db');

let db;
const logFilePath = path.join(app.getPath('userData'), 'backend.log'); // userData est un répertoire approprié pour stocker des données d'application
process.env.APP_ROOT_PATH = path.join(__dirname, '..');
const { Worker } = require('worker_threads');


// Créer le dossier de l'application s'il n'existe pas
if (!fs.existsSync(appFolderPath)) {
    fs.mkdirSync(appFolderPath);
}

// Créer le dossier des images converties s'il n'existe pas
if (!fs.existsSync(convertedImagesPath)) {
    fs.mkdirSync(convertedImagesPath);
}

// Créer le dossier des images converties s'il n'existe pas
if (!fs.existsSync(thumbnailsPath)) {
    fs.mkdirSync(thumbnailsPath);
}

// Définissez le chemin du fichier de journalisation
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

    // Options de base pour la fenêtre
    let windowOptions = {
        width: 1200,
        height: 800,
        minWidth: 800, // Largeur minimale de la fenêtre
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true, // Protège contre les attaques XSS
            preload: path.join(__dirname, 'preload.js') // Utilise un script de préchargement
        }
    };

    // Ajuste le style de la barre de titre pour Windows
    if (isWindows) {
        windowOptions.frame = true; // Utilise la barre de titre native de Windows
    } else if (process.platform === 'darwin') {
        windowOptions.titleBarStyle = 'hiddenInset';
        windowOptions.frame = false; // Pour une barre de titre complètement personnalisée
    }

    // Crée une nouvelle fenêtre du navigateur Electron
    let win = new BrowserWindow(windowOptions);

    // Supprime la barre de menu pour Windows
    if (isWindows) {
        win.setMenu(null);
    }

    // Charge le fichier HTML principal dans la fenêtre
    win.loadFile('dist/index.html');

    checkForUpdates();
    // Crée la base de données lors du lancement de l'application
    createDatabase();
}




// Fonction pour vérifier les mises à jour de l'application
function checkForUpdates() {
    console.log("Début de la vérification des mises à jour...");

    const options = {
        hostname: 'api.github.com',
        path: '/repos/Pleiode/AstroNest/releases/latest',
        method: 'GET',
        headers: { 'User-Agent': 'AstroNest' }
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
                            message: "Nouvelle version disponible. Souhaitez-vous la télécharger maintenant ? l'application se fermera pendant le téléchargement et vous devrez la relancer depuis la nouvelle version téléchargée.",
                            buttons: ['Quitter et télécharger', 'Plus tard']
                        }).then(result => {
                            if (result.response === 0) {
                                console.log("L'utilisateur a choisi de télécharger la mise à jour.");
                                setTimeout(() => {
                                    app.quit();
                                }, 1000); // 3000 millisecondes équivalent à 3 secondes
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
        thumbnailPath TEXT,
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

    {/* 

    //Ajout nouvelle colonne
    db.run(`ALTER TABLE images ADD COLUMN nouvelleColonne TEXT`, (err) => {
        if (err) {
            if (err.message.includes("duplicate column name")) {
                console.log("La colonne 'nouvelleColonne' existe déjà.");
            } else {
                console.error("Erreur lors de l'ajout de la nouvelle colonne:", err.message);
            }
        } else {
            console.log("Colonne 'nouvelleColonne' ajoutée avec succès.");
        }
    });*/}
}


// Gestionnaire d'événements pour l'événement "image-uploaded" envoyé depuis le processus de rendu
ipcMain.on("image-uploaded", (event, currentUploadingImage) => {
    // Destructuration de l'objet pour extraire les propriétés nécessaires
    const { path: imagePath, name: imageName, date, photoType, skyObject, constellation, location, opticalTube, mount, camera, objectType, darkPath, brutPath, offsetPath, flatPath } = currentUploadingImage;

    // Convertissez le tableau des tags "skyObject" en une chaîne pour le stockage
    const skyObjectString = skyObject.join(', ');

    // Initialisation de la variable shotDate avec la date actuelle
    let shotDate = new Date().toISOString().split('T')[0];



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
                    shotDate = new Date(result.tags.DateTimeOriginal * 1000).toISOString().split('T')[0];

                   
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

app.on('window-all-closed', () => {
    app.quit();
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


ipcMain.on('start-blink', (event, imagePaths) => {
   
});



// Gestionnaire d'événements pour l'événement "open-in-finder" envoyé depuis le processus de rendu
ipcMain.on('open-in-finder', (event, filePath) => {
    shell.showItemInFolder(filePath);
});

// Export image in JPG
ipcMain.on('export-image',  (event, filePath) => {
    console.log("Reçu export-image", filePath);
});

// Resize Windows app after Login
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

// Gestionnaire d'événements pour l'événement "open-default-app" envoyé depuis le processus de rendu
ipcMain.on('open-default-app', (event, filePath) => {
    shell.openPath(filePath).then((response) => {
        if (response) {
            console.error(`Erreur lors de l'ouverture du fichier : ${response}`);
            dialog.showMessageBox({
                type: 'error',
                title: 'Error',
                message: `Error: ${response}`
            });
        } else {
            console.log(`Fichier ouvert avec succès : ${filePath}`);
        }
    });
});

// Converter Raw
ipcMain.on('convert-raw', (event, imagePath) => {
    let basePath;
    if (process.env.NODE_ENV === 'development') {
        // basePath est un chemin relatif depuis le dossier de travail actuel en développement
        basePath = path.join(__dirname, 'meridio', '..');
    } else {
        // basePath est le chemin des ressources de l'application en production
        basePath = process.resourcesPath;
    }

    const outputImagePath = path.join(basePath, 'assets', 'image.svg');


    // Mettre à jour la base de données directement sans conversion réelle
    db.run(`UPDATE images SET convertPath = ? WHERE path = ?`, [outputImagePath, imagePath], function (err) {
        if (err) {
            console.error('Erreur lors de la mise à jour de la base de données', err);
            event.sender.send('db-update-error', { imagePath, error: err.message });
            return;
        }

        console.log(`Base de données mise à jour avec succès pour : ${imagePath}`);
        event.sender.send('conversion-done', { imagePath, convertedPath: outputImagePath });
    });
});



ipcMain.on('convert', (event, imagePath) => {
    console.log(`Reçu une demande de conversion pour : ${imagePath}`);
    queue.push({ event, imagePath }); // Ajouter à la file d'attente
    console.log(`File d'attente actuelle : ${queue.length}`);
    processQueue(); // Essayer de traiter la file d'attente
});



const queue = []; // File d'attente pour la conversion des images
let isProcessing = false; // Indicateur pour savoir si une conversion est en cours

function processQueue() {
    if (queue.length === 0) {
        console.log("Aucun élément dans la file d'attente à traiter.");
        return; // Rien à traiter
    }
    if (isProcessing) {
        console.log("Un traitement est déjà en cours. Attente...");
        return; // Traitement déjà en cours
    }

    console.log("Début du traitement de la file d'attente.");
    isProcessing = true;
    const { event, imagePath } = queue.shift(); // Prendre le premier élément
    console.log(`Traitement de l'image : ${imagePath}`);

    let outputFilename;
    const ext = path.extname(imagePath).toLowerCase();
    if (['.fits', '.fit', '.tif', '.tiff'].includes(ext)) {
        // Remplacer les extensions FITS et TIFF par .png pour la conversion
        outputFilename = path.basename(imagePath).replace(ext, '.png');
    } else {
        // Autres formats (PNG, JPG, JPEG, etc.) peuvent rester inchangés ou être traités différemment
        outputFilename = path.basename(imagePath);
    }

    const outputImagePath = path.join(convertedImagesPath, outputFilename);

    const outputThumbnailname = path.basename(imagePath).replace(path.extname(imagePath), '.webp');
    const outputThumbnailPath = path.join(thumbnailsPath, outputThumbnailname);  // Ajoutez cette ligne

    const worker = new Worker(path.join(__dirname, 'convertWorker.js'), {
        workerData: {
            scriptPath: getScriptPath(),
            imagePath: imagePath,
            outputImagePath: outputImagePath,
            outputThumbnailPath: outputThumbnailPath  // Ajoutez cette ligne
        }
    });


    worker.on('message', ({ convertedPath, thumbnailPath, imagePath }) => {
        console.log(`Conversion réussie : ${imagePath}`);
        console.log(`covertedpath : ${convertedPath}`);
        console.log(`thumbnailPath : ${thumbnailPath}`);
        // Utilisez convertedPath et thumbnailPath ici
        db.run(`UPDATE images SET convertPath = ?, thumbnailPath = ? WHERE path = ?`, [convertedPath, thumbnailPath, imagePath], function (err) {
            if (err) {
                event.reply('db-update-error', err.message);
                isProcessing = false;
                processQueue(); // Continue avec le prochain élément si une erreur se produit
                return;
            }

            // Répondre au frontend que la conversion est terminée et que la base de données est mise à jour
            event.reply('conversion-done', { imagePath: imagePath, convertedPath: convertedPath, thumbnailPath: thumbnailPath });
            isProcessing = false;
            processQueue(); // Traitement du prochain élément dans la file d'attente
        });
    });

    worker.on('error', (error) => {

        console.error(`Erreur dans le worker: ${error.message}`);
        event.reply('conversion-error', error.message);
        isProcessing = false;
        processQueue();
    });

    worker.on('exit', (code) => {
        if (code !== 0) {
            console.error(new Error(`Worker stopped with exit code ${code}`));
        } else {
            console.log(`Worker terminé avec succès pour ${imagePath}`);
        }
        isProcessing = false;
        processQueue();
    });
}

function getScriptPath() {
    return process.env.NODE_ENV === 'development'
        ? path.join(__dirname, 'converter.py')
        : path.join(process.resourcesPath, './python', './converter', 'converter');
}


