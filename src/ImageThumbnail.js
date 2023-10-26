import React, { useEffect, useState } from "react";


const ImageThumbnail = React.memo(({ file }) => {
    const [objectURL, setObjectURL] = useState(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setObjectURL(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    if (!objectURL) return null;

    return (
        <img
            src={objectURL}
            alt={file.name}
            style={{ width: "100px", height: "100px", objectFit: "cover" }}
        />
    );
});

export default ImageThumbnail;