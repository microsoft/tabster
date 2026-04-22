/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CrossOriginAPI } from "../CrossOrigin.js";
import type * as Types from "../Types.js";
import { getDeloser } from "./getDeloser.js";
import { getModalizer } from "./getModalizer.js";
import { getMover } from "./getMover.js";
import { getGroupper } from "./getGroupper.js";
import { getOutline } from "./getOutline.js";
import { getObservedElement } from "./getObservedElement.js";

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
