const { workerData, parentPort } = require('worker_threads');
const { exec } = require('child_process');

const { scriptPath, imagePath, outputImagePath, outputThumbnailPath } = workerData;

exec(`"${scriptPath}" "${imagePath}" "${outputImagePath}" "${outputThumbnailPath}"`, (error, stdout, stderr) => {
    if (error) {
        console.error('Erreur d\'exécution du script:', stderr); // Affiche les erreurs du script Python
        parentPort.postMessage({ error: error.message, stderr: stderr });
        return;
    }

    // Utiliser le retour à la ligne pour séparer les chemins
    const paths = stdout.trim().split("\n");
    const convertedPath = paths[0];
    const thumbnailPath = paths[1];

    parentPort.postMessage({ convertedPath: convertedPath, thumbnailPath: thumbnailPath, imagePath: imagePath });
});
