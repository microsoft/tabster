/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from './Types';

enum OldMoverKeys {
    Tab,
    Arrows,
    Both
}

interface OldMoverAxisOptions {
    Horizontal: 0;
    Vertical: 1;
}
const OldMoverAxis: OldMoverAxisOptions = {
    Horizontal: 0,
    Vertical: 1,
};
type OldMoverAxis = OldMoverAxisOptions[keyof OldMoverAxisOptions];

interface OldFocusableProps {
    isDefault?: boolean;
    isIgnored?: boolean;
    mover?: OldMoverOptions;
    ignoreAriaDisabled?: boolean;
}

type OldMoverOptions = {
    navigationType: OldMoverKeys;
    cyclic?: boolean;
    axis: OldMoverAxis,
    disableHomeEndKeys?: boolean;
};

export type OldTabsterAttributeProps =
    Omit<Types.TabsterAttributeProps, 'mover' | 'focusable'>
    &
    { focusable?: OldFocusableProps };

export function transformTabsterAttribute(old: OldTabsterAttributeProps): Types.TabsterAttributeProps {
    const ret = old as Types.TabsterAttributeProps;
    const focusable = old.focusable;

    if (focusable) {
        const oldMover = focusable.mover;

        if (oldMover) {
            delete focusable.mover;

            const mover: Types.MoverBasicProps = {};

            if (oldMover.cyclic) {
                mover.cyclic = true;
            }

            if (oldMover.disableHomeEndKeys) {
                mover.disableHomeEndKeys = true;
            }

            const navigationType = oldMover.navigationType;
            if ((navigationType !== undefined) && (navigationType !== OldMoverKeys.Arrows)) {
                mover.tabbable = true;
            }

            const axis = oldMover.axis;
            if (axis !== undefined) {
                if (axis === OldMoverAxis.Horizontal) {
                    mover.direction = Types.MoverDirections.Horizontal;
                } else if (axis === OldMoverAxis.Vertical) {
                    mover.direction = Types.MoverDirections.Vertical;
                }
            }

            ret.mover = mover;
        }
    }

    return ret;
}
