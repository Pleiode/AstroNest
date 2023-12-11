import React, { useState } from 'react';
import { X } from 'react-feather';


const Notification = ({ text, type, title }) => {
    const [isVisible, setIsVisible] = useState(true);

    const handleClose = () => {
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    const notificationStyle = {
        info: {
            backgroundColor: '#76ADF8',
            border: '1px solid #76ADF8',
            svg: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M4.5 2.5H19.5C20.6046 2.5 21.5 3.39543 21.5 4.5V19.5C21.5 20.6046 20.6046 21.5 19.5 21.5H4.5C3.39543 21.5 2.5 20.6046 2.5 19.5V4.5C2.5 3.39543 3.39543 2.5 4.5 2.5ZM5.5 4.5H18.5C19.0523 4.5 19.5 4.94772 19.5 5.5V18.5C19.5 19.0523 19.0523 19.5 18.5 19.5H5.5C4.94772 19.5 4.5 19.0523 4.5 18.5V5.5C4.5 4.94772 4.94772 4.5 5.5 4.5Z" fill="#182231" />
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M11 11V17H13V11H11ZM11 7V9H13V7H11Z" fill="#182231" />
                </svg>

            ),
        },
        tips: {
            backgroundColor: '#FDE39C',
            border: '1px solid #FDE39C',
            svg: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M9.97282 18H10.9998V13H12.9998V18H14.0268C14.1588 16.798 14.7718 15.806 15.7668 14.723C15.8798 14.601 16.5988 13.856 16.6838 13.75C18.6474 11.2968 18.3858 7.74425 16.0839 5.60527C13.7821 3.4663 10.2199 3.46554 7.91718 5.60353C5.61444 7.74153 5.35127 11.294 7.31382 13.748C7.39982 13.855 8.12082 14.601 8.23182 14.722C9.22782 15.806 9.84082 16.798 9.97282 18ZM9.99982 20V21H13.9998V20H9.99982ZM5.75382 15C3.13539 11.7285 3.48506 6.99083 6.5554 4.1392C9.62575 1.28757 14.3763 1.28833 17.4457 4.14094C20.5152 6.99355 20.8633 11.7313 18.2438 15.002C17.6238 15.774 15.9998 17 15.9998 18.5V21C15.9998 22.1045 15.1044 23 13.9998 23H9.99982C8.89525 23 7.99982 22.1045 7.99982 21V18.5C7.99982 17 6.37482 15.774 5.75382 15Z" fill="#3C3522" />
                </svg>


            ),
        }
    };


    return (
        <div className='notification' style={{ ...notificationStyle[type] }} >
            <div className='info'  >
                {notificationStyle[type].svg}
            </div>

            <div style={{ backgroundColor: 'var(--bg-color)', paddingBlock: '6px' }} >
                <p style={{ paddingInline: '12px', fontSize: '16px', color: 'var(--white)' }} >{title}</p>
                <p>{text}</p>
            </div>

            <div className='close-icon' onClick={handleClose} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: '6px' }}>
                <X size={20} />
            </div>
        </div>

    );
};

export default Notification;

