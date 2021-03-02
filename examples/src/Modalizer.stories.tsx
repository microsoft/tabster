import * as React from 'react';
import { Meta } from '@storybook/react';
import { getAbilityHelpersAttribute } from 'ability-helpers';
import { Modal } from './components/Modal';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
    title: 'Modalizer',
} as Meta;

export const ModalDialog = () => {
    const ref = React.useRef<Modal>(null);

    const onClick = () => ref.current?.show();
    return (
        <div aria-label='Main' { ...getAbilityHelpersAttribute({ modalizer: { id: 'main' }, deloser: {} })}>
            <button onClick={onClick}>Open modal</button>
            <Modal ref={ref} />
        </div>
    )
}
