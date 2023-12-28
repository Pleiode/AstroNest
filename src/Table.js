import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useTable, useResizeColumns, useBlockLayout } from 'react-table';

const CustomTable = ({ data, handleImageClick, isSelected, formatDate }) => {
    // Récupération des largeurs sauvegardées
    const initializeColumnWidths = () => {
        const savedWidths = localStorage.getItem('columnWidths');
        return savedWidths ? JSON.parse(savedWidths) : {};
    };

    // Initialisation des colonnes visibles
    const initializeVisibleColumns = () => {
        const savedVisibleColumns = localStorage.getItem('visibleColumns');
        return savedVisibleColumns ? JSON.parse(savedVisibleColumns) : [
            'name', 'photoType', 'date', 'skyObject', 'location', 'constellation'
        ];
    };

    const [visibleColumns, setVisibleColumns] = useState(initializeVisibleColumns());
    const [columnWidths, setColumnWidths] = useState(initializeColumnWidths());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
    const modalRef = useRef();

    const handleRightClick = (event) => {
        event.preventDefault();
        setModalPosition({ x: event.clientX, y: event.clientY });
        setIsModalOpen(true);
    };

    const handleClickOutside = (event) => {
        if (modalRef.current && !modalRef.current.contains(event.target)) {
            setIsModalOpen(false);
        }
    };

    useEffect(() => {
        if (isModalOpen) {
            document.addEventListener('click', handleClickOutside, true);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside, true);
        };
    }, [isModalOpen]);

    const handleColumnVisibilityChange = (accessor) => {
        setVisibleColumns(prev =>
            prev.includes(accessor) ? prev.filter(col => col !== accessor) : [...prev, accessor]
        );
    };

    useEffect(() => {
        localStorage.setItem('visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    const allColumns = useMemo(() => [
        { Header: 'Nom', accessor: 'name' },
        { Header: 'Type', accessor: 'photoType' },
        {
            Header: 'Date',
            accessor: 'date',
            Cell: ({ value }) => formatDate(value)
        },
        { Header: 'Objet', accessor: 'skyObject' },
        { Header: 'Type d\'objet', accessor: 'objectType' },
        { Header: 'Constellation', accessor: 'constellation' },
        { Header: 'Ascension Droite', accessor: 'AD' },
        { Header: 'Déclinaison', accessor: 'DEC' },
        { Header: 'Lieu', accessor: 'location' },
        { Header: 'Résolution', accessor: 'resolution' },
        { Header: 'Taille', accessor: 'size' },
        { Header: 'Instrument', accessor: 'instrument' },
        { Header: 'Tube Optique', accessor: 'opticalTube' },
        { Header: 'Monture', accessor: 'mount' },
        { Header: 'Caméra', accessor: 'camera' },

    ], [formatDate]);

    const columns = useMemo(() => allColumns.filter(column => visibleColumns.includes(column.accessor))
        .map(column => ({
            ...column,
            width: columnWidths[column.accessor] || 150
        })), [visibleColumns, columnWidths, allColumns]);

    const tableInstance = useTable({
        columns,
        data,
        initialState: { columnResizing: { columnWidths } },
    }, useBlockLayout, useResizeColumns);

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
        state
    } = tableInstance;

    useEffect(() => {
        if (!state.columnResizing.isResizingColumn) {
            const newWidths = { ...columnWidths, ...state.columnResizing.columnWidths };
            if (JSON.stringify(newWidths) !== JSON.stringify(columnWidths)) {
                setColumnWidths(newWidths);
                localStorage.setItem('columnWidths', JSON.stringify(newWidths));
            }
        }
    }, [state.columnResizing.columnWidths, state.columnResizing.isResizingColumn]);


    return (
        <>


            <table {...getTableProps()} >
                <thead>
                    {headerGroups.map(headerGroup => (
                        <tr {...headerGroup.getHeaderGroupProps()}>
                            {headerGroup.headers.map(column => (
                                <th {...column.getHeaderProps()} onContextMenu={handleRightClick} style={{ width: column.width }}>
                                    {column.render('Header')}
                                    <div {...column.getResizerProps()} className={`resizer ${column.isResizing ? 'isResizing' : ''}`} />
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody {...getTableBodyProps()}>
                    {rows.map(row => {
                        prepareRow(row);
                        const image = row.original;
                        return (
                            <tr {...row.getRowProps({ onClick: (e) => handleImageClick(image, e) })} className={isSelected(image) ? 'focus-image' : ''}>
                                {row.cells.map(cell => (
                                    <td {...cell.getCellProps()}>
                                        {cell.render('Cell')}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>



            {isModalOpen && (
                <div ref={modalRef} className='modale' style={{ top: modalPosition.y, left: modalPosition.x, zIndex: 1000 }}>
                    {allColumns.map(column => (
                        <label key={column.accessor}>
                            <font> {column.Header}</font>

                            <input
                                type="checkbox"
                                checked={visibleColumns.includes(column.accessor)}
                                onChange={() => handleColumnVisibilityChange(column.accessor)}
                            />

                        </label>
                    ))}
                </div>
            )}
        </>
    );
};

export default CustomTable;
