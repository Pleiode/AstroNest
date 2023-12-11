#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import asyncio
import numpy as np
from astropy.io import fits
from PIL import Image

# Constantes pour les valeurs par défaut
MAX_SIZE_DEFAULT = 200
CONTRAST_DEFAULT = 1.0
BIAS_DEFAULT = 0.0

semaphore = asyncio.Semaphore(10)  # Limite de 10 tâches simultanées

async def normalize_data(data):
    def normalize_sync(data):
        percentile_low, percentile_high = np.percentile(data, [2, 98])
        data_clipped = np.clip(data, percentile_low, percentile_high)
        data_min = data_clipped.min()
        data_max = data_clipped.max()
        return ((data_clipped - data_min) / (data_max - data_min) * 255).astype(np.uint8)

    return await asyncio.to_thread(normalize_sync, data)

def adjust_contrast_bias(data, contrast=CONTRAST_DEFAULT, bias=BIAS_DEFAULT):
    return np.clip(255 * contrast * (data / 255 - 0.5) + 0.5 + bias, 0, 255).astype(np.uint8)

def convert_to_webp(input_path, output_path):
    with Image.open(input_path) as img:
        img.save(output_path, 'WEBP', lossless=True)

def resize_and_save_image(image, output_path, max_size):
    width, height = image.size
    scale = min(max_size / height, max_size / width)
    if scale < 1:
        image = image.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS)
    image.save(output_path, 'WEBP', lossless=True)

async def convert_image(input_path, output_path, max_size=MAX_SIZE_DEFAULT, is_fits=False):
    async with semaphore:
        if not os.path.exists(input_path):
            print(f"Le fichier {input_path} n'existe pas.")
            return

        try:
            data = fits.getdata(input_path) if is_fits else Image.open(input_path)
            if is_fits:
                data = await normalize_data(data)
                data = adjust_contrast_bias(data)
                image = Image.fromarray(data, 'L')
            else:
                image = data
            resize_and_save_image(image, output_path, max_size)
        except Exception as e:
            print(f"Erreur lors de la lecture du fichier: {e}")
            return

        print(output_path)

async def process_files(file_paths, output_paths):
    tasks = []
    for input_path, output_path in zip(file_paths, output_paths):
        is_fits = input_path.lower().endswith(('.fit', '.fits'))
        is_tiff = input_path.lower().endswith(('.tif', '.tiff'))

        if is_fits or is_tiff:
            task = asyncio.create_task(convert_image(input_path, output_path, is_fits=is_fits))
        else:
            print(f"Format non pris en charge : {input_path}")
            continue
        tasks.append(task)
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    if len(sys.argv) < 3 or len(sys.argv) % 2 != 1:
        print("Usage: script.py <path_to_file> <output_path> [<path_to_file> <output_path> ...]")
        sys.exit(1)

    file_paths = sys.argv[1::2]
    output_paths = sys.argv[2::2]
    asyncio.run(process_files(file_paths, output_paths))
