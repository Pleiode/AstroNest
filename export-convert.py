#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from PIL import Image
from astropy.io import fits

def convert_fits_to_jpeg(fits_path, jpeg_path):
    print(f"Ouverture du fichier FITS : {fits_path}")
    with fits.open(fits_path) as hdul:
        data = hdul[0].data

    # Normalisation des données
    norm = (data - data.min()) / (data.max() - data.min())
    image = Image.fromarray((norm * 255).astype('uint8'))

    print(f"Enregistrement de l'image JPEG : {jpeg_path}")
    image.save(jpeg_path)

def convert_tiff_to_jpeg(tiff_path, jpeg_path):
    print(f"Ouverture du fichier TIFF : {tiff_path}")
    with Image.open(tiff_path) as img:
        img.save(jpeg_path)
    print(f"Enregistrement de l'image JPEG : {jpeg_path}")

def main():
    input_path = sys.argv[1]
    output_path = sys.argv[2]

    print(f"Chemin d'entrée : {input_path}")
    print(f"Chemin de sortie : {output_path}")

    if input_path.lower().endswith('.fit') or input_path.lower().endswith('.fits'):
        convert_fits_to_jpeg(input_path, output_path)
    elif input_path.lower().endswith('.tiff') or input_path.lower().endswith('.tif'):
        convert_tiff_to_jpeg(input_path, output_path)
    else:
        print("Format non supporté")
        sys.exit(1)

if __name__ == "__main__":
    main()
