#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import rawpy
import imageio
from PIL import Image

def convert_image(input_path, output_path, max_size=200):
    file_extension = os.path.splitext(input_path)[1].lower()
    if file_extension in ['.cr2', '.arw']:  # Ajouter d'autres formats RAW si nécessaire
        with rawpy.imread(input_path) as raw:
            rgb = raw.postprocess()
            img = Image.fromarray(rgb)
    else:
        img = Image.open(input_path)

    # Calculer le facteur de redimensionnement pour maintenir le ratio d'aspect
    width, height = img.size
    scaling_factor = min(max_size / width, max_size / height)

    # Redimensionner si nécessaire
    if scaling_factor < 1:
        img = img.resize((int(width * scaling_factor), int(height * scaling_factor)), Image.ANTIALIAS)

    img.save(output_path, format='WEBP')

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python converter_raw.py <input_path> <output_path>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    convert_image(input_path, output_path)
