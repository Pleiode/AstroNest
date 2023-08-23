import React from 'react';
import { Search } from 'react-feather';
import { Upload } from 'react-feather';




const Header = ({ searchTerm, onSearchChange, onImportClick }) => {
    const fileInputRef = React.useRef(null);

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };



    return (
        <header>
            <div className='container-header'>
                <Search className="search-icon" strokeWidth={2} />
                <input
                    type="text"
                    className="search-input"
                    placeholder="Rechercher"
                    value={searchTerm}
                    onChange={e => onSearchChange(e.target.value)}
                />
            </div>

            <button onClick={handleImportClick}>
                <Upload strokeWidth={2} width={'16px'} /> Importer
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={onImportClick}
                multiple
            />

        </header>
    );
}


export default Header;
