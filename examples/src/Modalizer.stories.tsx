/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta } from '@storybook/react';
import { Modal } from './components/Modal';
import * as React from 'react';
import { getCurrentTabster, getDeloser, getModalizer, getTabsterAttribute } from 'tabster';

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

export const PopupContent = () => {
    const [open, setOpen ] = React.useState<boolean>(false);
    const popupRef = React.useRef<HTMLDivElement>();

    // Use callback ref because it will run before DOM element is removed from the tree
    const callbackRef = React.useCallback((node: HTMLDivElement) => {
        const tabster = getCurrentTabster(window);
        const modalizer = tabster && getModalizer(tabster);
        const deloser = tabster && getDeloser(tabster);
        if (!modalizer || !deloser) {
            return;
        }

        if (node) {
            popupRef.current = node;
            modalizer.add(popupRef.current, {id: 'popup'});
            deloser.add(popupRef.current);
            modalizer.focus(popupRef.current);
        } else if (!node && popupRef.current) {
            modalizer.remove(popupRef.current);
            deloser.remove(popupRef.current);
        }
    }, [popupRef]);

    const onClick = () => setOpen(s => !s);

    const popupStyles = {
        maxWidth: 400,
        maxHeight: 400,
        border: '1px solid',
        padding: 5
    };

    return (
        <>
            <div  { ...getTabsterAttribute({ deloser: {} })}>
                <button onClick={onClick}>Toggle popup</button>
            </div>
            {open && <div aria-label={'popup'} ref={callbackRef} style={popupStyles}>
                <div tabIndex={0}>Focusable item</div>
                <div tabIndex={0}>Focusable item</div>
                <div tabIndex={0}>Focusable item</div>
                <div tabIndex={0}>Focusable item</div>
                <button onClick={onClick}>Dismiss</button>
            </div>}
            <div { ...getTabsterAttribute({ deloser: {} })}>
                <button>Do not focus</button>
            </div>
        </>
    );
};

export const FocusWithoutModalizerAPI = () => {
    const modalRef = React.useRef<HTMLDivElement>(null);
    const outsideRef = React.useRef<HTMLButtonElement>(null);
    const popupStyles = {
        maxWidth: 400,
        maxHeight: 400,
        border: '2px solid green',
        padding: 5,
        marginTop: 5,
        marginBottom: 5
    };

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
        <>
            <div  >
                <button onClick={focusIn}>Focus modalizer</button>
            </div>
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
            <div >
                <button ref={outsideRef}>Outside modal</button>
            </div>
        </>
    ); 
};
