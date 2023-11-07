import React from 'react';

const ImageDisplay = ({ viewMode, sortedImages, groupBy, getGroupKey, handleImageClick, isSelected, handleImageDoubleClick, loadImageToCanvas, formatDate }) => {


    return (
        <div className="container" >
            {viewMode === 'grid' ? (
                Object.entries(groupBy(sortedImages(), getGroupKey)).map(([key, imgs]) => (
                    <div key={key}>
                        <h2>{key}</h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'left' }}>
                            {imgs.map(image => (
                                <div key={image.id} className={`image-container ${viewMode}`} style={{ position: 'relative' }}>

                                    <img src={image.path}
                                        alt={image.name}
                                        onClick={(e) => handleImageClick(image, e)}
                                        className={isSelected(image) ? 'focus-image' : ''}
                                        style={{ height: "100px", width: 'auto' }} />

                                </div>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Nom</th>
                            <th>Type</th>
                            <th>Date</th>
                            <th>Objet</th>
                            <th>Lieu</th>
                            <th>Constellation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedImages().map(image => (
                            <tr onClick={(e) => handleImageClick(image, e)}
                                key={image.id}
                            >
                                <td className={isSelected(image) ? 'focus' : ''}  >
                                    {image.path.endsWith('.tif') ? (
                                        <canvas ref={canvas => loadImageToCanvas(image.path, image, (loadedCanvas) => {
                                            canvas.parentNode.replaceChild(loadedCanvas, canvas);
                                        })} />
                                    ) : (
                                        <img src={image.path} alt={image.name} style={{ height: "40px", width: 'auto' }} />
                                    )}
                                </td>
                                <td className={isSelected(image) ? 'focus' : ''} >{image.name}</td>
                                <td className={isSelected(image) ? 'focus' : ''} >{image.photoType}</td>
                                <td className={isSelected(image) ? 'focus' : ''} style={{ whiteSpace: 'nowrap' }}>{formatDate(image.date)}</td>
                                <td className={isSelected(image) ? 'focus' : ''}>{image.skyObject}</td>
                                <td className={isSelected(image) ? 'focus' : ''} >{image.location}</td>
                                <td className={isSelected(image) ? 'focus' : ''} >{image.constellation}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

}

export default ImageDisplay;
