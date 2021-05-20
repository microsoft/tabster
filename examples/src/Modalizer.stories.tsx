/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta } from '@storybook/react';
import { Modal } from './components/Modal';
import * as React from 'react';
import { getCurrentTabster, getModalizer, getTabsterAttribute } from 'tabster';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
    title: 'Modalizer',
} as Meta;

export const ModalDialog = () => {
    const ref = React.useRef<Modal>(null);

    const onClick = () => ref.current?.show();
    return (
        <>
            <div { ...getTabsterAttribute({ deloser: {} })}>
                <button onClick={onClick}>Open modal</button>
            </div>
            <Modal ref={ref} />
        </>
    );
};

const popupStyles = {
    maxWidth: 400,
    maxHeight: 400,
    border: '2px solid green',
    padding: 5,
    marginTop: 5,
    marginBottom: 5
}; 

export const NativeFocus = () => {
    const [open, setOpen ] = React.useState<boolean>(false);
    const popupRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (open && popupRef.current) {
            const first = getCurrentTabster(window)?.focusable.findFirst(popupRef.current);
            first?.focus();
        }
    }, [popupRef, open]);

    const onClick = () => setOpen(s => !s);

    return (
        <div  { ...getTabsterAttribute({ deloser: {} })}>
            <button onClick={onClick}>Toggle popup</button>
            {open && (
                <>
                    <div 
                        ref={popupRef} 
                        aria-label={'popup'} 
                        style={popupStyles} 
                        {...getTabsterAttribute({ deloser: {}, modalizer: { id: 'modalizer'} })}
                    >
                        <div tabIndex={0}>Focusable item</div>
                        <div tabIndex={0}>Focusable item</div>
                        <div tabIndex={0}>Focusable item</div>
                        <div tabIndex={0}>Focusable item</div>
                        <button onClick={onClick}>Dismiss</button>
                    </div>
                    <button>Outside Modalizer</button>
                </>
            )}
        </div>
    );

};

export const ModalizerAPIFocus = () => {
    const [open, setOpen ] = React.useState<boolean>(false);
    const popupRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const tabster = getCurrentTabster(window);
        const modalizer = tabster && getModalizer(tabster);
        if (open && popupRef.current && modalizer) {
            modalizer.focus(popupRef.current);
        }

    }, [open, popupRef]);

    const onClick = () => setOpen(s => !s);
    return (
        <div  { ...getTabsterAttribute({ deloser: {} })}>
            <button onClick={onClick}>Toggle popup</button>
            {open && (
                <>
                    <div 
                        ref={popupRef} 
                        aria-label={'popup'} 
                        style={popupStyles} 
                        {...getTabsterAttribute({ deloser: {}, modalizer: { id: 'modalizer'} })}
                    >
                        <div tabIndex={0}>Focusable item</div>
                        <div tabIndex={0}>Focusable item</div>
                        <div tabIndex={0}>Focusable item</div>
                        <div tabIndex={0}>Focusable item</div>
                        <button onClick={onClick}>Dismiss</button>
                    </div>
                    <button>Outside Modalizer</button>
                </>
            )}
        </div>
    );
};

export const AlwaysOnPage = () => {
    const modalRef = React.useRef<HTMLDivElement>(null);
    const outsideRef = React.useRef<HTMLButtonElement>(null);

    const focusIn = () => {
        if (modalRef.current) {
            modalRef.current.removeAttribute('aria-hidden');
            const first = getCurrentTabster(window)?.focusable.findFirst(modalRef.current);
            first?.focus();
        }
    };

    const focusOut = () => {
        if (modalRef.current && outsideRef.current) {
            modalRef.current.setAttribute('aria-hidden', 'true');
            outsideRef.current.focus();
        }
    };

    return (
        <div  { ...getTabsterAttribute({ deloser: {} })}>
            <button onClick={focusIn}>Focus modalizer</button>
            <div 
                aria-hidden 
                ref={modalRef} 
                aria-label={'popup'} 
                style={popupStyles} 
                {...getTabsterAttribute({ modalizer: { id: 'modalizer'} })}
            >
                <div tabIndex={0}>Focusable item</div>
                <div tabIndex={0}>Focusable item</div>
                <div tabIndex={0}>Focusable item</div>
                <div tabIndex={0}>Focusable item</div>
                <button onClick={focusOut}>Focus out</button>
            </div>
            <button ref={outsideRef}>Outside modal</button>
        </div>
    ); 
};

export const AllowFocusOutside = () => {
    const modalRef = React.useRef<HTMLDivElement>(null);
    const outsideRef = React.useRef<HTMLButtonElement>(null);

    const focusIn = () => {
        if (modalRef.current) {
            modalRef.current.removeAttribute('aria-hidden');
            const first = getCurrentTabster(window)?.focusable.findFirst(modalRef.current);
            first?.focus();
        }
    };

    const focusOut = () => {
        if (modalRef.current && outsideRef.current) {
            modalRef.current.setAttribute('aria-hidden', 'true');
            outsideRef.current.focus();
        }
    };

    return (
        <div  { ...getTabsterAttribute({ deloser: {} })}>
            <button onClick={focusIn}>Activate modalizer</button>
            <div 
                aria-hidden 
                ref={modalRef} 
                aria-label={'popup'} 
                style={popupStyles} 
                {...getTabsterAttribute({ modalizer: { id: 'modalizer', isOthersAccessible: true} })}
            >
                <div tabIndex={0}>Focusable item</div>
                <div tabIndex={0}>Focusable item</div>
                <div tabIndex={0}>Focusable item</div>
                <div tabIndex={0}>Focusable item</div>
                <button onClick={focusOut}>Deactivate modalizer</button>
            </div>
            <button ref={outsideRef}>Outside modal</button>
        </div>
    ); 
};
