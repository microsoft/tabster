/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from 'react';
import { getCurrentTabster } from 'tabster';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  title: 'Examples/KeyboardNavigationState',
};

export const KeyboardNavigationState = () => {
    const [message, setMessage] = React.useState('undetermined');
    const onFocus = () => {
        const tabster = getCurrentTabster(window);
        const isKeyboard = tabster?.keyboardNavigation.isNavigatingWithKeyboard();
        if (isKeyboard) {
            setMessage('keyboard');
        } else {
            setMessage('mouse');
        }

    };
    return (
        <>
            <div>Focused with: <strong>{message}</strong></div>
            <button onFocus={onFocus}>Click or use keyboard</button>
            <button onFocus={onFocus}>Click or use keyboard</button>
            <button onFocus={onFocus}>Click or use keyboard</button>
            <button onFocus={onFocus}>Click or use keyboard</button>
        </>
    );
};
