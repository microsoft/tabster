import * as React from 'react';
import { getTabsterAttribute, Types as TabsterTypes } from 'tabster';

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

export const ArrowNavigationVertical = () => (
    <div { ...getTabsterAttribute({ focusable: { mover: { navigationType: TabsterTypes.MoverKeys.Arrows, axis: TabsterTypes.MoverAxis.Vertical } } }) }>
        <Collection />
    </div>
);

export const ArrowNavigationHorizontal = () => (
    <div { ...getTabsterAttribute({ focusable: { mover: { navigationType: TabsterTypes.MoverKeys.Arrows, axis: TabsterTypes.MoverAxis.Horizontal } } }) }>
        <Collection />
    </div>
);

export const ArrowNavigationCircular = () => (
    <div { ...getTabsterAttribute({ focusable: { mover: { cyclic: true, navigationType: TabsterTypes.MoverKeys.Arrows, axis: TabsterTypes.MoverAxis.Vertical } } }) }>
        <Collection />
    </div>
);
