import * as React from 'react';
import { getCurrentAbilityHelpers } from 'ability-helpers';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  title: 'KeyboardNavigationState',
};

export const KeyboardNavigationState = () => {
    const [message, setMessage] = React.useState('undetermined');
    const onFocus = () => {
        const ah = getCurrentAbilityHelpers(window);
        const isKeyboard = ah?.keyboardNavigation.isNavigatingWithKeyboard();
        if (isKeyboard) {
            setMessage('keyboard')
        } else {
            setMessage('mouse');
        }

    }
    return (
        <>
            <div>Focused with: <strong>{message}</strong></div>
            <button onFocus={onFocus}>Click or use keyboard</button>
            <button onFocus={onFocus}>Click or use keyboard</button>
            <button onFocus={onFocus}>Click or use keyboard</button>
            <button onFocus={onFocus}>Click or use keyboard</button>
        </>
    )
};
