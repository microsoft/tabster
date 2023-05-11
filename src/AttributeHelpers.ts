/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from "./Types";

export function getTabsterAttribute<E extends Types.TabsterAttributeProps>(
    props: Types.TabsterAttributeProps & E
): Types.TabsterDOMAttribute;
export function getTabsterAttribute<E extends Types.TabsterAttributeProps>(
    props: Types.TabsterAttributeProps & E,
    plain: true
): string;
export function getTabsterAttribute<E extends Types.TabsterAttributeProps>(
    props: Types.TabsterAttributeProps & E,
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
 * Updates Tabster props object with new props.
 * @param element an element to set data-tabster attribute on.
 * @param props current Tabster props to update.
 * @param newProps new Tabster props to add.
 *  When the value of a property in newProps is undefined, the property
 *  will be removed from the attribute.
 */
export function mergeTabsterProps<E extends Types.TabsterAttributeProps>(
    props: Types.TabsterAttributeProps & E,
    newProps: Types.TabsterAttributeProps & E
): void {
    for (const key of Object.keys(
        newProps
    ) as (keyof (Types.TabsterAttributeProps & E))[]) {
        const value = newProps[key];

        if (value) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            props[key] = value as any;
        } else {
            delete props[key];
        }
    }
}

/**
 * Sets or updates Tabster attribute of the element.
 * @param element an element to set data-tabster attribute on.
 * @param newProps new Tabster props to set.
 * @param update if true, newProps will be merged with the existing props.
 *  When true and the value of a property in newProps is undefined, the property
 *  will be removed from the attribute.
 */
export function setTabsterAttribute<E extends Types.TabsterAttributeProps>(
    element: HTMLElement,
    newProps: Types.TabsterAttributeProps & E,
    update?: boolean
): void {
    let props: typeof newProps | undefined;

    if (update) {
        const attr = element.getAttribute(Types.TabsterAttributeName);

        if (attr) {
            try {
                props = JSON.parse(attr);
            } catch (e) {
                if (__DEV__) {
                    console.error(
                        `data-tabster attribute error: ${e}`,
                        element
                    );
                }
            }
        }
    }

    if (!props) {
        props = {} as typeof newProps;
    }

    mergeTabsterProps(props, newProps);

    if (Object.keys(props).length > 0) {
        element.setAttribute(
            Types.TabsterAttributeName,
            getTabsterAttribute(props, true)
        );
    } else {
        element.removeAttribute(Types.TabsterAttributeName);
    }
}
