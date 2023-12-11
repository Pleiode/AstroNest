#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from astropy.io import fits
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Slider, Button
import numpy as np
import imageio.v2 as imageio
import os

def load_images(paths):
    images = []
    titles = []  # Liste pour stocker les titres
    for path in paths:
        title = os.path.basename(path)
        titles.append(title)  # Ajouter le nom du fichier à la liste des titres

        if path.lower().endswith(('.fit', '.fits')):
            images.append(fits.getdata(path))
        else:
            try:
                image = imageio.imread(path)
                images.append(image)
            except ValueError:
                print(f"Error reading image: {path}")
                continue

    return images, titles

def adjust_image(image, upper_percentile):
    upper_bound = np.percentile(image, upper_percentile)
    adjusted_image = np.clip(image, 0, upper_bound)
    adjusted_image = adjusted_image / upper_bound * 255
    return adjusted_image.astype(np.uint8)

def update_frame(frame_number):
    global current_frame, percentile, titles, img_display, ax, fig

    if ax:
        ax.remove()
    ax = fig.add_subplot(111)
    ax.set_facecolor('#191919')
    ax.axis('off')

    current_frame = frame_number % len(images)
    image = adjust_image(images[current_frame], percentile)
    
    img_display = ax.imshow(image, cmap='gray', aspect='equal')
    ax.set_aspect('equal')
    ax.set_title(titles[current_frame], color='white')

    if len(image.shape) == 2:
        img_display.set_cmap('gray')
        img_display.set_clim(0, 255)

def update_percentile(val):
    global percentile
    percentile = val
    update_frame(current_frame)

def toggle_animation(event):
    global anim_running, button
    if anim_running:
        anim.event_source.stop()
        anim_running = False
        button.label.set_text('Play')
    else:
        anim.event_source.start()
        anim_running = True
        button.label.set_text('Pause')

if __name__ == "__main__":
    image_paths = sys.argv[1:]
    images, titles = load_images(image_paths)
    current_frame = 0
    percentile = 99.5

    if not images:
        print("Aucune image à afficher.")
        sys.exit(1)

    fig, ax = plt.subplots()
    fig.patch.set_facecolor('black')

    ax = None
    img_display = None

    plt.subplots_adjust(left=0.1, right=0.9, top=0.9, bottom=0.3)

    ax_slider_percentile = plt.axes([0.1, 0.15, 0.8, 0.03], facecolor='lightgoldenrodyellow')
    slider_percentile = Slider(ax_slider_percentile, 'Percentile', 99, 100, valinit=percentile)
    slider_percentile.on_changed(update_percentile)

    anim = FuncAnimation(fig, update_frame, interval=1000)
    anim_running = True

    # Ajouter un bouton pour mettre en pause/reprendre l'animation
    ax_button = plt.axes([0.1, 0.05, 0.1, 0.04])  # Ajuster la position et la taille du bouton
    button = Button(ax_button, 'Pause', color='white', hovercolor='0.975')
    button.on_clicked(toggle_animation)

    plt.show()