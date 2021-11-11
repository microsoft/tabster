/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TabsterInternal } from '../Types';

export const runIfControlled = !process.env.UNCONTROLLED ? describe : xdescribe;
export const runIfUnControlled = process.env.UNCONTROLLED ? describe : xdescribe;

export interface WindowWithTabsterInternal extends Window {
    __tabsterInstance: TabsterInternal;
}
