import * as React from 'react';
import { Meta } from '@storybook/react';
import { getAbilityHelpersAttribute, getCurrentAbilityHelpers, getDeloser, getModalizer } from 'ability-helpers';
import { Modal } from './components/Modal';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
    title: 'Modalizer',
    decorators: [
        (Story) => {
            const ah = getCurrentAbilityHelpers(window);
            
            // These APIs need to initialized before use, no reason to do it for all stories yet
            if (ah) {
                getModalizer(ah);
                getDeloser(ah);
            }

            return <Story />;
        }
    ]
  
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
