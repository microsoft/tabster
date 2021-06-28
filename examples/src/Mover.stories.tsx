/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from 'react';
import { getTabsterAttribute, Types as TabsterTypes } from 'tabster';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
    title: 'Examples/Mover',
};

const Collection = () => (
    <>
        <button>Navigate</button>
        <button>Me</button>
        <button>With</button>
        <button>Arrow</button>
        <button>Keys</button>
    </>
);

export const ArrowNavigationVertical = () => (
    <div
        {...getTabsterAttribute({
            focusable: {
                mover: {
                    navigationType: TabsterTypes.MoverKeys.Arrows,
                    axis: TabsterTypes.MoverAxis.Vertical,
                },
            },
        })}
    >
        <Collection />
    </div>
);

export const ArrowNavigationHorizontal = () => (
    <div
        style={{ display: 'flex'}}
        {...getTabsterAttribute({
            focusable: {
                mover: {
                    navigationType: TabsterTypes.MoverKeys.Arrows,
                    axis: TabsterTypes.MoverAxis.Horizontal,
                },
            },
        })}
    >
        <Collection />
    </div>
);

export const ArrowNavigationHorizontalRtl = () => (
    <div
        style={{ display: 'flex'}}
        dir='rtl'
        {...getTabsterAttribute({
            focusable: {
                mover: {
                    navigationType: TabsterTypes.MoverKeys.Arrows,
                    axis: TabsterTypes.MoverAxis.Horizontal,
                },
            },
        })}
    >
        <Collection />
    </div>
);

export const ArrowNavigationCircular = () => (
    <div
        {...getTabsterAttribute({
            focusable: {
                mover: {
                    cyclic: true,
                    navigationType: TabsterTypes.MoverKeys.Arrows,
                    axis: TabsterTypes.MoverAxis.Vertical,
                },
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
                focusable: {
                    mover: {
                        cyclic: true,
                        navigationType: TabsterTypes.MoverKeys.Arrows,
                        axis: TabsterTypes.MoverAxis.Vertical,
                    },
                },
            })}
        >
            <Collection />
            <div
                style={{ marginLeft: 10, marginTop: 10 }}
                {...getTabsterAttribute({
                    focusable: {
                        mover: {
                            cyclic: true,
                            navigationType: TabsterTypes.MoverKeys.Arrows,
                            axis: TabsterTypes.MoverAxis.Vertical,
                        },
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
