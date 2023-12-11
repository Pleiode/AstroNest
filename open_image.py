#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import numpy as np
import matplotlib.pyplot as plt
from astropy.io import fits
import matplotlib.widgets as widgets
import matplotlib
matplotlib.use('TkAgg')


# Définir les paramètres par défaut
PERCENTILE_MIN = 98
PERCENTILE_MAX = 100
PERCENTILE_INIT = 99.5

def adjust_grayscale(image_data, upper_percentile):
    """ Ajuste l'échelle des gris en fonction du percentile supérieur spécifié. """
    upper_bound = np.percentile(image_data, upper_percentile)
    return np.clip(image_data, 0, upper_bound) / upper_bound * 255

def display_fit_image(file_path):
    """ Affiche une image FITS avec un curseur pour ajuster le percentile supérieur. """
    try:
        with fits.open(file_path) as hdul:
            image_data = hdul[0].data
    except Exception as e:
        print(f"Erreur lors de la lecture du fichier FITS : {e}")
        return

    height, width = image_data.shape
    fig, ax = plt.subplots(figsize=(8, 8 * height / width))
    plt.subplots_adjust(left=0, right=1, bottom=0.15, top=1)

    img_plot = ax.imshow(image_data, cmap='gray', norm=plt.Normalize())
    ax.axis('off')

    # Curseur pour le percentile supérieur
    ax_upper = plt.axes([0.25, 0.05, 0.65, 0.03], facecolor='lightgoldenrodyellow')
    slider_upper = widgets.Slider(ax=ax_upper, label='Percentile Supérieur', 
                                  valmin=PERCENTILE_MIN, valmax=PERCENTILE_MAX, 
                                  valinit=PERCENTILE_INIT, facecolor='blue')

    def update(val):
        img_plot.set_data(adjust_grayscale(image_data, slider_upper.val))
        img_plot.autoscale()
        fig.canvas.draw_idle()

    slider_upper.on_changed(update)

    try:
        plt.show()
    except Exception as e:
        print(f"Impossible d'afficher la figure : {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        display_fit_image(sys.argv[1])
    else:
        print("Veuillez fournir un chemin de fichier FITS.")
