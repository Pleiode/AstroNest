#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import asyncio
import numpy as np
from astropy.io import fits
from PIL import Image

semaphore = asyncio.Semaphore(10)  # Limite de 10 tâches simultanées

async def normalize_data(data, loop):
    def normalize_sync(data):
        percentile_low, percentile_high = np.percentile(data, [2, 98])
        data_clipped = np.clip(data, percentile_low, percentile_high)
        data_min = data_clipped.min()
        data_max = data_clipped.max()
        return ((data_clipped - data_min) / (data_max - data_min) * 255).astype(np.uint8)

    return await loop.run_in_executor(None, normalize_sync, data)

def adjust_contrast_bias(data, contrast=1.0, bias=0.0):
    return np.clip(255 * contrast * (data / 255 - 0.5) + 0.5 + bias, 0, 255).astype(np.uint8)

async def convert_fits_to_webp(input_path, output_path, max_size=200, loop=None):
    async with semaphore:
        if not os.path.exists(input_path):
            print(f"Le fichier {input_path} n'existe pas.")
            return

        try:
            data = fits.getdata(input_path)
        except Exception as e:
            print(f"Erreur lors de la lecture du fichier FITS: {e}")
            return

        normalized_data = await normalize_data(data, loop)
        contrast_value = 1.0
        bias_value = 0.0
        adjusted_data = adjust_contrast_bias(normalized_data, contrast=contrast_value, bias=bias_value)

        image = Image.fromarray(adjusted_data, 'L')
        resize_and_save_image(image, output_path, max_size)
        print(output_path)

async def convert_tif_to_webp(input_path, output_path, max_size=200, loop=None):
    async with semaphore:
        if not os.path.exists(input_path):
            print(f"Le fichier {input_path} n'existe pas.")
            return

        try:
            image = Image.open(input_path)
        except Exception as e:
            print(f"Erreur lors de la lecture du fichier TIF: {e}")
            return

        resize_and_save_image(image, output_path, max_size)
        print(output_path)

def resize_and_save_image(image, output_path, max_size):
    width, height = image.size
    scale = min(max_size / height, max_size / width)
    if scale < 1:
        image = image.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS)

    image.save(output_path, 'WEBP')

async def process_files(file_paths, output_paths):
    loop = asyncio.get_running_loop()
    tasks = []
    for input_path, output_path in zip(file_paths, output_paths):
        if input_path.lower().endswith('.fit') or input_path.lower().endswith('.fits'):
            task = asyncio.create_task(convert_fits_to_webp(input_path, output_path, loop=loop))
        elif input_path.lower().endswith('.tif') or input_path.lower().endswith('.tiff'):
            task = asyncio.create_task(convert_tif_to_webp(input_path, output_path, loop=loop))
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
