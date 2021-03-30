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

export const ArrowNavigation = () => (
    <div { ...getTabsterAttribute({ focusable: { mover: { navigationType: TabsterTypes.MoverKeys.Arrows } } }) }>
        <Collection />
    </div>
);

export const ArrowNavigationCircular = () => (
    <div { ...getTabsterAttribute({ focusable: { mover: { cyclic: true, navigationType: TabsterTypes.MoverKeys.Arrows } } }) }>
        <Collection />
    </div>
);

export const NestedMovers = () => (
    <div>
        <button>Tabstop</button>
        <div style={{border: '1px solid', padding: 10}} { ...getTabsterAttribute({ focusable: { mover: { cyclic: true, navigationType: TabsterTypes.MoverKeys.Arrows } } }) }>
            <Collection />
            <div style={{marginLeft: 10, marginTop: 10}} { ...getTabsterAttribute({ focusable: { mover: { cyclic: true, navigationType: TabsterTypes.MoverKeys.Arrows } } }) }>
                <Collection />
            </div>
        </div>
        <button>Tabstop</button>
    </div>
);
