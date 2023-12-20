/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export type WalkerType = "shadow" | "slot" | "light";

export interface TreeWalkerWithType extends TreeWalker {
    __type__?: WalkerType;
    __inSlot__?: boolean;
}

export type ShadowRootOrSlot = {
    type: WalkerType;
    node: Node;
};
