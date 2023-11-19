#!/usr/bin/env python3
# -*- coding: utf-8 -*-


import sys
from astropy.io import fits
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from PIL import Image
import numpy as np
import cv2
import imageio
import easygui


def load_images(paths):
    images = []
    for path in paths:
        if path.endswith(('.fit', '.fits')):
            images.append(fits.getdata(path))
        elif path.endswith(('.png', '.jpg', '.jpeg')):
            image = Image.open(path)
            images.append(np.array(image))
    return images

def update_frame(frame_number):
    global current_frame
    current_frame = frame_number % len(images)
    image = images[current_frame]
    img_display.set_data(image)
    if len(image.shape) == 2:  # FITS or grayscale image
        img_display.set_cmap('gray')
        img_display.set_clim(image.min(), image.max())

def next_image(event):
    global anim
    anim.event_source.stop()
    update_frame(current_frame + 1)

def previous_image(event):
    global anim
    anim.event_source.stop()
    update_frame(current_frame - 1)

def start_stop_animation(event):
    if anim.running:
        anim.event_source.stop()
        anim.running = False
    else:
        anim.event_source.start()
        anim.running = True

def align_images(base_image, image_to_align):
    # Convertir en niveaux de gris
    base_gray = cv2.cvtColor(base_image, cv2.COLOR_BGR2GRAY) if len(base_image.shape) == 3 else base_image
    align_gray = cv2.cvtColor(image_to_align, cv2.COLOR_BGR2GRAY) if len(image_to_align.shape) == 3 else image_to_align

    # Détection des caractéristiques et descripteurs
    sift = cv2.SIFT_create()
    keypoints1, descriptors1 = sift.detectAndCompute(base_gray, None)
    keypoints2, descriptors2 = sift.detectAndCompute(align_gray, None)

    # Correspondance des caractéristiques
    matcher = cv2.BFMatcher()
    matches = matcher.knnMatch(descriptors1, descriptors2, k=2)

    # Filtrer les bonnes correspondances
    good_matches = [m for m, n in matches if m.distance < 0.7 * n.distance]

    # Calcul de la transformation si suffisamment de bonnes correspondances sont trouvées
    if len(good_matches) > 4:
        src_pts = np.float32([keypoints1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([keypoints2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

        matrix, _ = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        aligned_image = cv2.warpPerspective(image_to_align, matrix, base_image.shape[1::-1])

        return aligned_image

    return image_to_align  # Retourner l'image non alignée si l'alignement échoue

def load_and_align_images(paths):
    images = []
    for path in paths:
        if path.endswith(('.fit', '.fits')):
            images.append(fits.getdata(path))
        elif path.endswith(('.png', '.jpg', '.jpeg')):
            image = Image.open(path)
            images.append(np.array(image))
    # Aligner les images
    base_image = images[0]
    return [align_images(base_image, img) for img in images]


# Fonction pour exporter l'animation en GIF
def export_to_gif(event, gif_path):
    if gif_path:  # Utilisez le chemin fourni pour sauvegarder le GIF
        imageio.mimsave(gif_path, images, fps=1)
        print(f"Animation exportée en GIF sous : {gif_path}")
    else:
        print("Chemin de sauvegarde non spécifié. Exportation annulée.")


if __name__ == "__main__":

    
    image_paths = sys.argv[1:]
    print(f"Chemins d'image reçus : {image_paths}")
    images = load_and_align_images(image_paths)
    current_frame = 0

    if not images:
        print("Aucune image à afficher.")
        sys.exit(1)

    fig, ax = plt.subplots()
    img_display = ax.imshow(images[0], cmap='gray')
    anim = FuncAnimation(fig, update_frame, interval=1000)
    anim.running = True

    # Boutons
    plt.subplots_adjust(bottom=0.2)
    axprev = plt.axes([0.1, 0.05, 0.1, 0.075])
    axnext = plt.axes([0.21, 0.05, 0.1, 0.075])
    axstartstop = plt.axes([0.32, 0.05, 0.15, 0.075])
    bnext = plt.Button(axnext, 'Suivant')
    bnext.on_clicked(next_image)
    bprev = plt.Button(axprev, 'Précédent')
    bprev.on_clicked(previous_image)
    bstartstop = plt.Button(axstartstop, 'Démarrer/Arrêter')
    bstartstop.on_clicked(start_stop_animation)

    axexportgif = plt.axes([0.5, 0.05, 0.15, 0.075])
    bexportgif = plt.Button(axexportgif, 'Exporter en GIF')
    bexportgif.on_clicked(export_to_gif)

    
    plt.show()
