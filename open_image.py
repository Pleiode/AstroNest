import numpy as np
import matplotlib.pyplot as plt
from astropy.io import fits
import matplotlib.widgets as widgets
import sys
import matplotlib as mpl

def adjust_grayscale(image_data, upper_percentile):
    """ Ajuste l'échelle des gris en fonction du percentile supérieur spécifié. """
    upper_bound = np.percentile(image_data, upper_percentile)
    scaled_data = np.clip(image_data, 0, upper_bound)
    scaled_data = scaled_data / upper_bound * 255
    return scaled_data.astype(np.uint8)

def display_fit_image(file_path):
    """ Affiche une image FITS avec un curseur pour ajuster le percentile supérieur. """
    mpl.rcParams['toolbar'] = 'toolbar2'  # Active la barre d'outils de navigation

    with fits.open(file_path) as hdul:
        image_data = hdul[0].data

    height, width = image_data.shape
    fig_ratio = width / height
    fig, ax = plt.subplots(figsize=(8 * fig_ratio, 8))

    plt.subplots_adjust(left=0, right=1, bottom=0.15, top=1)

    img_plot = ax.imshow(image_data, cmap='gray', norm=plt.Normalize())
    ax.axis('off')

    # Curseur pour le percentile supérieur, ajusté pour des valeurs très élevées
    slider_height = 0.03
    ax_upper = plt.axes([0.25, 0.05, 0.65, slider_height], facecolor='lightgoldenrodyellow')

    slider_upper = widgets.Slider(ax=ax_upper, label='Percentile Supérieur', valmin=95, valmax=100, valinit=99.5, facecolor='blue', alpha=0.6)

    def update(val):
        upper_percentile = slider_upper.val
        scaled_data = adjust_grayscale(image_data, upper_percentile)
        img_plot.set_data(scaled_data)
        img_plot.autoscale()
        fig.canvas.draw_idle()

    slider_upper.on_changed(update)

    plt.show()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        display_fit_image(file_path)
    else:
        print("Veuillez fournir un chemin de fichier FITS.")
