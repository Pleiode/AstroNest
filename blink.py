#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from astropy.io import fits
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Slider
import numpy as np
import imageio.v2 as imageio
import os  # Ajouté pour obtenir le nom du fichier

def load_images(paths):
    images = []
    titles = []  # Liste pour stocker les titres
    for path in paths:
        if path.endswith(('.fit', '.fits')):
            images.append(fits.getdata(path))
        else:
            images.append(imageio.imread(path))
        titles.append(os.path.basename(path))  # Ajouter le nom du fichier à la liste des titres
    return images, titles

def adjust_image(image, upper_percentile):
    upper_bound = np.percentile(image, upper_percentile)
    adjusted_image = np.clip(image, 0, upper_bound)
    adjusted_image = adjusted_image / upper_bound * 255
    return adjusted_image.astype(np.uint8)

def update_frame(frame_number):
    global current_frame, percentile, titles
    current_frame = frame_number % len(images)
    image = adjust_image(images[current_frame], percentile)
    img_display.set_data(image)
    ax.set_title(titles[current_frame], color='white')  # Définir le titre en blanc
    if len(image.shape) == 2:  # FITS or grayscale image
        img_display.set_cmap('gray')
        img_display.set_clim(0, 255)

def update_percentile(val):
    global percentile
    percentile = val
    update_frame(current_frame)

if __name__ == "__main__":
    image_paths = sys.argv[1:]
    images, titles = load_images(image_paths)  # Modifier pour récupérer également les titres
    current_frame = 0
    percentile = 99.5

    if not images:
        print("Aucune image à afficher.")
        sys.exit(1)

    fig, ax = plt.subplots()
    fig.patch.set_facecolor('#191919')
    ax.set_facecolor('#191919')

    plt.subplots_adjust(left=0.1, right=0.9, top=0.9, bottom=0.25)

    img_display = ax.imshow(images[0], cmap='gray')
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_title(titles[0], color='white')  # Afficher le titre de la première image

    ax_slider = plt.axes([0.1, 0.05, 0.8, 0.03], facecolor='lightgoldenrodyellow')
    slider = Slider(ax_slider, 'Percentile', 99, 100, valinit=percentile)
    slider.on_changed(update_percentile)

    anim = FuncAnimation(fig, update_frame, interval=1000)
    plt.show()
