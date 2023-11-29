#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import asyncio
import numpy as np
from astropy.io import fits
from PIL import Image
from concurrent.futures import ThreadPoolExecutor

output_directory = os.getenv('APP_ROOT_PATH', os.path.join(os.path.dirname(__file__), 'cache-images'))
semaphore = asyncio.Semaphore(10)  # Limite de 10 tâches simultanées

async def normalize_data(data, loop):
    def normalize_sync(data):
        # Tronquer les valeurs extrêmes pour éviter la domination des valeurs aberrantes
        percentile_low, percentile_high = np.percentile(data, [2, 98])
        data_clipped = np.clip(data, percentile_low, percentile_high)

        # Normalisation après le tronquage
        data_min = data_clipped.min()
        data_max = data_clipped.max()
        return ((data_clipped - data_min) / (data_max - data_min) * 255).astype(np.uint8)

    return await loop.run_in_executor(None, normalize_sync, data)


def adjust_contrast_bias(data, contrast=1.0, bias=0.0):
    # Ajuster le contraste et le biais
    return np.clip(255 * contrast * (data / 255 - 0.5) + 0.5 + bias, 0, 255).astype(np.uint8)


async def convert_fits_to_webp(input_path, output_directory, max_size=200, loop=None):
    async with semaphore:
        if not os.path.exists(input_path):
            print(f"Le fichier spécifié n'a pas été trouvé: {input_path}")
            return

        if not os.path.exists(output_directory):
            os.makedirs(output_directory)

        base_filename = os.path.basename(input_path)
        output_filename = base_filename.replace(".fits", ".webp").replace(".fit", ".webp")
        output_path = os.path.join(output_directory, output_filename)

        if os.path.exists(output_path):
            print(output_path)
            return

        try:
            data = fits.getdata(input_path)
        except Exception as e:
            print(f"Erreur lors de la lecture du fichier FITS: {e}")
            return

        normalized_data = await normalize_data(data, loop)

        # Ajustez ces valeurs selon vos besoins
        contrast_value = 1.0  # Valeur par défaut pour le contraste
        bias_value = 0.0       # Valeur par défaut pour le biais

        adjusted_data = adjust_contrast_bias(normalized_data, contrast=contrast_value, bias=bias_value)

        image = Image.fromarray(adjusted_data, 'L')
        width, height = image.size
        scale = min(max_size / height, max_size / width)
        if scale < 1:
            image = image.resize((int(width*scale), int(height*scale)), Image.Resampling.LANCZOS)

        image.save(output_path, 'WEBP')
        print(output_path)

async def process_files(file_paths, output_directory):
    loop = asyncio.get_running_loop()
    tasks = []
    for input_path in file_paths:
        task = asyncio.create_task(convert_fits_to_webp(input_path, output_directory, loop=loop))
        tasks.append(task)
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: script.py <path_to_fits_file> [<path_to_fits_file> ...]")
        sys.exit(1)

    file_paths = sys.argv[1:]
    asyncio.run(process_files(file_paths, output_directory))
