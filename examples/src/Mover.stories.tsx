import * as React from 'react';
import { getAbilityHelpersAttribute, Types as AHTypes } from 'ability-helpers';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  title: 'Mover',
};

const Collection = () => (
    <>
        <button>A</button>
        <button>bunch</button>
        <button>of</button>
        <button>buttons</button>
        <button>which</button>
        <button>are</button>
        <button>navigable</button>
        <button>using</button>
        <button>arrows</button>
        <button>instead</button>
        <button>of</button>
        <button>tabs</button>
    </>

)

export const ArrowNavigation = () => (
    <div { ...getAbilityHelpersAttribute({ focusable: { mover: { navigationType: AHTypes.MoverKeys.Arrows } } }) }>
        <Collection />
    </div>
);

export const ArrowNavigationCircular = () => (
    <div { ...getAbilityHelpersAttribute({ focusable: { mover: { cyclic: true, navigationType: AHTypes.MoverKeys.Arrows } } }) }>
        <Collection />
    </div>
);
