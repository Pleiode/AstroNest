const { app, BrowserWindow, ipcMain } = require('electron');
const electron = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const exifParser = require('exif-parser');
// Obtenez le chemin du dossier de données de l'utilisateur
const userDataPath = electron.app.getPath('userData');
// Définissez le chemin complet de votre base de données
const dbPath = path.join(__dirname, 'Database.db');
console.log("Database path:", dbPath);

let win;
let db;

function createWindow() {
    win = new BrowserWindow({
        width: 1100,
        height: 750,
        minWidth: 500, // Minimum width of the window
        minHeight: 400,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true, // protège contre les attaques XSS
            preload: path.join(__dirname, 'preload.js') // utilisez un script de préchargement
        }
    })

    win.loadFile('dist/index.html')
    createDatabase();
}

app.whenReady().then(createWindow)

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('will-quit', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Closed the database connection.');
    });
});


function createDatabase() {
    // Utilisez ce chemin pour initialiser votre base de données
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error("Error opening database:", err);
            return;
        }
    });


    db.run(`CREATE TABLE IF NOT EXISTS images(
    id INTEGER PRIMARY KEY,
    name TEXT,
    path TEXT,
    skyObject TEXT,
    date TEXT
  )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });
}

ipcMain.on("update-skyObject", (event, { imageId, skyObject }) => {
    db.run(`UPDATE images SET skyObject = ? WHERE id = ?`, [skyObject, imageId], function (err) {
        if (err) {
            console.error("Error updating image:", err.message);
            event.reply("update-skyObject-reply", { success: false });
            return;
        }
        console.log(`Updated skyObject for image with id ${imageId}`);
        event.reply("update-skyObject-reply", { success: true });
    });
});


ipcMain.on("image-uploaded", (event, imagePath) => {
    const imageName = path.basename(imagePath);
    const fileExtension = path.extname(imagePath).toLowerCase();

    let shotDate = new Date().toISOString();

    if (fileExtension === '.jpeg' || fileExtension === '.jpg') {
        try {
            const buffer = fs.readFileSync(imagePath);
            const parser = exifParser.create(buffer);
            const result = parser.parse();

            if (result && result.tags && result.tags.DateTimeOriginal) {
                // Si DateTimeOriginal est un nombre (timestamp Unix)
                if (typeof result.tags.DateTimeOriginal === "number") {
                    const exifDate = new Date(result.tags.DateTimeOriginal * 1000); // Convertir le timestamp en millisecondes
                    if (!isNaN(exifDate.getTime())) {
                        shotDate = exifDate.toISOString();
                    } else {
                        console.error("Date des métadonnées EXIF invalide (après conversion):", result.tags.DateTimeOriginal);
                    }
                }
                // Si DateTimeOriginal est sous forme de chaîne (format standard EXIF)
                else {
                    const exifDate = new Date(result.tags.DateTimeOriginal);
                    if (!isNaN(exifDate.getTime())) {  // Vérification que la date est valide
                        shotDate = exifDate.toISOString();
                    } else {
                        console.error("Date des métadonnées EXIF invalide (format standard):", result.tags.DateTimeOriginal);
                    }
                }
            }

            console.log("Raw EXIF DateTimeOriginal:", result.tags.DateTimeOriginal);
            
        } catch (error) {
            console.error("Erreur lors de la lecture des métadonnées EXIF:", error);
        }
    }

    db.run(`INSERT INTO images(name, path, date) VALUES(?, ?, ?)`, [imageName, imagePath, shotDate], function (err) {
        if (err) {
            return console.log(err.message);
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);
        event.reply("image-added", this.lastID);
    });
});




// Listen for get images event from renderer process
ipcMain.on("get-images", (event) => {
    db.all(`SELECT * FROM images ORDER BY date DESC`, [], (err, rows) => {
        if (err) {
            throw err;
        }
        // Send images data back to renderer process
        event.reply("get-images-reply", rows);
    });
});




ipcMain.on("delete-image", (event, id) => {
    db.run(`DELETE FROM images WHERE id = ?`, id, (err) => {
        if (err) {
            return console.log(err.message);
        }
        console.log(`Row(s) deleted ${this.changes}`);
        // Send confirmation that the image was deleted
        event.reply("image-deleted", id);
    });
});

