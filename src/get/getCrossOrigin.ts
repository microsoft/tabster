/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CrossOriginAPI } from "../CrossOrigin";
import type * as Types from "../Types";
import { getDeloser } from "./getDeloser";
import { getModalizer } from "./getModalizer";
import { getMover } from "./getMover";
import { getGroupper } from "./getGroupper";
import { getOutline } from "./getOutline";
import { getObservedElement } from "./getObservedElement";

export function getCrossOrigin(tabster: Types.Tabster): Types.CrossOriginAPI {
    const tabsterCore = tabster.core;
    if (!tabsterCore.crossOrigin) {
        getDeloser(tabster);
        getModalizer(tabster);
        getMover(tabster);
        getGroupper(tabster);
        getOutline(tabster);
        getObservedElement(tabster);
        tabsterCore.crossOrigin = new CrossOriginAPI(tabsterCore);
    }

    return tabsterCore.crossOrigin;
}
