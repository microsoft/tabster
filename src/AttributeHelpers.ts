/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from "./Types";

export function getTabsterAttribute(
    props: Types.TabsterAttributeProps
): Types.TabsterDOMAttribute;
export function getTabsterAttribute(
    props: Types.TabsterAttributeProps,
    plain: true
): string;
export function getTabsterAttribute(
    props: Types.TabsterAttributeProps,
    plain?: true
): Types.TabsterDOMAttribute | string {
    const attr = JSON.stringify(props);

    if (plain === true) {
        return attr;
    }

    return {
        [Types.TabsterAttributeName]: attr,
    };
}

/**
 * Sets or updates Tabster attribute of the element.
 * @param element an element to set data-tabster attribute on.
 * @param newProps new Tabster props to set.
 * @param update if true, newProps will be merged with the existing props.
 *  When true and the value of a property in newProps is undefined, the property
 *  will be removed from the attribute.
 */
export function setTabsterAttribute(
    element: HTMLElement,
    newProps: Types.TabsterAttributeProps,
    update?: boolean
): void {
    let props: Types.TabsterAttributeProps | undefined;

    if (update) {
        const attr = element.getAttribute(Types.TabsterAttributeName);

        if (attr) {
            try {
                props = JSON.parse(attr);
            } catch (e) {
                /**/
            }
        }
    }

    if (!update || !props) {
        props = {};
    }

    for (const key of Object.keys(
        newProps
    ) as (keyof Types.TabsterAttributeProps)[]) {
        const value = newProps[key];

        if (value) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            props[key] = value as any;
        } else {
            delete props[key];
        }
    }

    if (Object.keys(props).length > 0) {
        element.setAttribute(
            Types.TabsterAttributeName,
            getTabsterAttribute(props, true)
        );
    } else {
        element.removeAttribute(Types.TabsterAttributeName);
    }
}
