import sys
import os
import asyncio
import numpy as np
from astropy.io import fits
from PIL import Image

async def normalize_data(data):
    # Normaliser les données pour couvrir la plage 0-255
    data_min = data.min()
    data_max = data.max()
    return ((data - data_min) / (data_max - data_min) * 255).astype(np.uint8)

async def convert_fits_to_webp(input_path, output_directory, max_size=200):
    # Vérifier si le fichier d'entrée existe
    if not os.path.exists(input_path):
        print(f"Le fichier spécifié n'a pas été trouvé: {input_path}")
        return

    # Créer le répertoire de sortie s'il n'existe pas
    if not os.path.exists(output_directory):
        os.makedirs(output_directory)

    # Construire le chemin de sortie
    base_filename = os.path.basename(input_path)
    output_filename = base_filename.replace(".fits", ".webp").replace(".fit", ".webp")
    output_path = os.path.join(output_directory, output_filename)

    # Vérifier si l'image WebP existe déjà
    if os.path.exists(output_path):
        print(output_path)  # Retourner le chemin si l'image existe déjà
        return

    # Lire seulement les données d'image du fichier FITS
    try:
        data = fits.getdata(input_path)
    except Exception as e:
        print(f"Erreur lors de la lecture du fichier FITS: {e}")
        return

    # Normaliser les données
    normalized_data = await normalize_data(data)

    # Convertir les données en une image PIL
    image = Image.fromarray(normalized_data, 'L')  # 'L' pour les images en niveaux de gris

    # Redimensionner l'image si nécessaire
    width, height = image.size
    scale = min(max_size / height, max_size / width)
    if scale < 1:
        image = image.resize((int(width*scale), int(height*scale)), Image.Resampling.LANCZOS)

    # Enregistrer l'image en format WebP
    image.save(output_path, 'WEBP')

    print(output_path)

async def process_files(file_paths, output_directory):
    tasks = []
    for input_path in file_paths:
        task = asyncio.create_task(convert_fits_to_webp(input_path, output_directory))
        tasks.append(task)
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: script.py <path_to_fits_file> [<path_to_fits_file> ...]")
        sys.exit(1)

    output_directory = os.path.join(os.path.dirname(__file__), 'cache-images')
    file_paths = sys.argv[1:]
    asyncio.run(process_files(file_paths, output_directory))
