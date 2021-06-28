/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from 'react';
import { getTabsterAttribute } from 'tabster';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
    title: 'Examples/Deloser',
};

export const Basic = () => {
    const onClick = (e: React.MouseEvent) => {
        (e.target as HTMLButtonElement).style.display = 'none';
    };

    return (
        <div {...getTabsterAttribute({deloser: {}})}>
            <button onClick={onClick}>Remove me</button>
            <button onClick={onClick}>Remove me</button>
            <button onClick={onClick}>Remove me</button>
            <button onClick={onClick}>Remove me</button>
            <button onClick={onClick}>Remove me</button>
        </div>
    );
};
