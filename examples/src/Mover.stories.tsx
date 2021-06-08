/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

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
);

export const ArrowNavigationVertical = () => (
    <div
        {...getTabsterAttribute({
            mover: {
                direction: TabsterTypes.MoverDirections.Vertical,
            },
        })}
    >
        <Collection />
    </div>
);

export const ArrowNavigationHorizontal = () => (
    <div
        {...getTabsterAttribute({
            mover: {
                direction: TabsterTypes.MoverDirections.Horizontal,
            },
        })}
    >
        <Collection />
    </div>
);

export const ArrowNavigationHorizontalRtl = () => (
    <div
        dir='rtl'
        {...getTabsterAttribute({
            mover: {
                direction: TabsterTypes.MoverDirections.Horizontal,
                cyclic: true
            },
        })}
    >
        <Collection />
    </div>
);

export const ArrowNavigationCircular = () => (
    <div
        {...getTabsterAttribute({
            mover: {
                direction: TabsterTypes.MoverDirections.Horizontal,
                cyclic: true,
            },
        })}
    >
        <Collection />
    </div>
);

export const NestedMovers = () => (
    <div>
        <button>Tabstop</button>
        <div
            style={{ border: '1px solid', padding: 10 }}
            {...getTabsterAttribute({
                mover: {
                    cyclic: true,
                    direction: TabsterTypes.MoverDirections.Horizontal,
                },
            })}
        >
            <Collection />
            <div
                style={{ marginLeft: 10, marginTop: 10 }}
                {...getTabsterAttribute({
                        mover: {
                            cyclic: true,
                            direction: TabsterTypes.MoverDirections.Horizontal,
                        },
                })}
            >
                <Collection />
            </div>
            <div style={{ paddingTop: 10 }}>
                <button>In root mover</button>
                <button>In root mover</button>
            </div>
        </div>
        <button>Tabstop</button>
    </div>
);
