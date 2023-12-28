#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import asyncio
import numpy as np
from astropy.io import fits
from PIL import Image

# Constantes pour les valeurs par défaut
CONTRAST_DEFAULT = 2.0
BIAS_DEFAULT = 1.0

# Utilisation d'un sémaphore pour limiter les tâches simultanées
semaphore = asyncio.Semaphore(2)


async def normalize_data(data):
    """Normalise les données d'image FITS pour le traitement."""

    def normalize_sync(data):
        percentile_low, percentile_high = np.percentile(data, [2, 98])
        data_clipped = np.clip(data, percentile_low, percentile_high)
        data_min = data_clipped.min()
        data_max = data_clipped.max()
        return ((data_clipped - data_min) / (data_max - data_min) * 255).astype(
            np.uint8
        )

    return await asyncio.to_thread(normalize_sync, data)


def adjust_contrast_bias(data, contrast=CONTRAST_DEFAULT, bias=BIAS_DEFAULT):
    """Ajuste le contraste et le biais de l'image."""
    return np.clip(255 * contrast * (data / 255 - 0.5) + 0.5 + bias, 0, 255).astype(
        np.uint8
    )


def save_image_as_png(image, output_path):
    """Enregistre l'image au format PNG."""
    image.save(output_path, "PNG")


def save_thumbnail(image, thumbnail_path, max_size=200):
    """Enregistre un aperçu de l'image (thumbnail) au format WEBP avec une taille maximale de 150px."""
    image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    image.save(thumbnail_path, "WEBP")



async def convert_image(input_path, output_path, thumbnail_path, is_fits=False):
    """Convertit les images FITS en WEBP, TIFF en PNG et crée des miniatures pour PNG, JPG et JPEG."""
    async with semaphore:
        if not os.path.exists(input_path):
            print(f"Le fichier {input_path} n'existe pas.")
            return

        try:
            # Traitement spécifique pour les fichiers FITS
            if is_fits:
                data = fits.getdata(input_path, memmap=False)
                data = await normalize_data(data)
                data = adjust_contrast_bias(data)
                image = Image.fromarray(data, "L")
                save_image_as_png(image, output_path)

            # Traitement pour les fichiers TIFF - convertir en PNG
            elif input_path.lower().endswith((".tif", ".tiff")):
                image = Image.open(input_path)
                save_image_as_png(image, output_path)  # Modification ici

            # Traitement pour les fichiers PNG, JPG, JPEG - création de miniatures uniquement
            elif input_path.lower().endswith((".png", ".jpg", ".jpeg")):
                image = Image.open(input_path)
                # Pas de conversion en WEBP pour l'image originale

            else:
                print(f"Format non pris en charge : {input_path}")
                return

            # Créer et sauvegarder la miniature au format WEBP pour tous les formats
            save_thumbnail(image, thumbnail_path)

        except Exception as e:
            print(f"Erreur lors de la lecture du fichier: {e}")
            return
        finally:
            if is_fits and "data" in locals():
                del data
            if "image" in locals():
                image.close()

        print(output_path)
        print(thumbnail_path)

async def process_files(file_paths, output_paths, thumbnail_paths):
    """Traite les fichiers d'entrée et produit les fichiers de sortie."""
    tasks = []
    for input_path, output_path, thumbnail_path in zip(file_paths, output_paths, thumbnail_paths):
        is_fits = input_path.lower().endswith((".fit", ".fits"))
        task = asyncio.create_task(
            convert_image(input_path, output_path, thumbnail_path, is_fits=is_fits)
        )
        tasks.append(task)
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    if len(sys.argv) < 4 or len(sys.argv) % 3 != 1:
        print(
            "Usage: script.py <path_to_file> <output_path> <thumbnail_path> [<path_to_file> <output_path> <thumbnail_path> ...]"
        )
        sys.exit(1)

    file_paths = sys.argv[1::3]
    output_paths = sys.argv[2::3]
    thumbnail_paths = sys.argv[3::3]
    asyncio.run(process_files(file_paths, output_paths, thumbnail_paths))
