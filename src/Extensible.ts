/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from "./Types";

/**
 * A helper to give Tabster parts ability to be extended.
 * Stores callbacks to be called when an instance is created or disposed.
 */
export class ExtensibleAPI<A, I, E> implements Types.ExtensibleAPI<A, I, E> {
    protected _isInitialized = false;
    protected _tabster: Types.TabsterCore;
    protected _win: Types.GetWindow;
    private _extensions: Set<Types.TabsterPartExtensionClass<A, I, E>> =
        new Set();
    private _extensionInstances: Map<
        Types.TabsterPartExtensionClass<A, I, E>,
        Types.TabsterPartExtension<A, I, E>
    > = new Map();

    constructor(tabster: Types.TabsterCore, getWindow: Types.GetWindow) {
        this._tabster = tabster;
        this._win = getWindow;
    }

    /**
     * Should be called by the Tabster part (for example, MoverAPI) to trigger an event and
     * call the handlers of that event in the extensions.
     * @param name event name.
     * @param details event details.
     */
    triggerExtensionEvent<N extends keyof E>(name: N, details: E[N]): void {
        this._extensionInstances.forEach((extension) => {
            extension.onEvent?.(
                name,
                details,
                this as unknown as A,
                this._tabster,
                this._win
            );
        });
    }

    /**
     * Should be called by the Tabster part once it has finished the initialization.
     */
    _setInitialized(): void {
        if (!this._isInitialized) {
            this._isInitialized = true;

            this._extensions.forEach((Extension) => {
                this._createExtension(Extension);
            });
        }
    }

    /**
     * To register an extension.
     * @param Extension class (not instance), it will be instantiated at the proper time.
     */
    registerExtension(
        Extension: Types.TabsterPartExtensionClass<A, I, E>
    ): void {
        if (this._extensions.has(Extension)) {
            return;
        }

        this._extensions.add(Extension);

        if (this._isInitialized) {
            this._createExtension(Extension);
        }
    }

    /**
     * To unregister an extension.
     * @param Extension class (not instance).
     */
    unregisterExtension(
        Extension: Types.TabsterPartExtensionClass<A, I, E>
    ): void {
        const extensionInstance = this._extensionInstances.get(Extension);

        if (extensionInstance) {
            extensionInstance.dispose(
                this as unknown as A,
                this._tabster,
                this._win
            );
        }

        this._extensions.delete(Extension);
        this._extensionInstances.delete(Extension);
    }

    /**
     * Should be called by the Tabster part when an instance of that part is created.
     * (for example by the MoverAPI when Mover instance is created). Will call the
     * `instanceCreated` method of all registered extensions.
     * @param instance a newly created instance of a Tabster part.
     */
    _instanceCreated(instance: I): void {
        this._extensionInstances.forEach((extension) =>
            extension.instanceCreated(
                instance,
                this as unknown as A,
                this._tabster,
                this._win
            )
        );
    }

    /**
     * Should be called by the Tabster part when an instance of that part is about to dispose.
     * (for example by the MoverAPI when Mover instance is created). Will call the
     * `instanceDispose` method of all registered extensions.
     * @param instance a instance of a Tabster part.
     */
    _instanceDispose(instance: I): void {
        this._extensionInstances.forEach((extension) =>
            extension.instanceDispose(
                instance,
                this as unknown as A,
                this._tabster,
                this._win
            )
        );
    }

    private _createExtension(
        Extension: Types.TabsterPartExtensionClass<A, I, E>
    ): void {
        this._extensionInstances.set(
            Extension,
            new Extension(this as unknown as A, this._tabster)
        );
    }

    /**
     * The Tabster part should call super.dispose() when it is disposing to clean
     * the extensions up.
     */
    dispose(): void {
        this._extensionInstances.forEach((extension) =>
            extension.dispose(this as unknown as A, this._tabster, this._win)
        );
        this._extensionInstances.clear();
        this._extensions.clear();
    }
}
