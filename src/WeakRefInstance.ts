/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// IE11 compat, checks if WeakRef is supported
export const _canUseWeakRef = typeof WeakRef !== "undefined";

/**
 * Allows disposable instances to be used
 */
export interface Disposable {
  isDisposed?(): boolean;
}

/**
 * WeakRef wrapper around a HTMLElement that also supports IE11
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef}
 * @internal
 */
export class WeakRefInstance<T extends Disposable | object> {
  private _weakRef?: WeakRef<T>;
  private _instance?: T;

  constructor(instance: T) {
    if (_canUseWeakRef && typeof instance === "object") {
      this._weakRef = new WeakRef(instance);
    } else {
      this._instance = instance;
    }
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef/deref}
   */
  deref(): T | undefined {
    let instance: T | undefined;

    if (this._weakRef) {
      instance = this._weakRef?.deref();

      if (!instance) {
        delete this._weakRef;
      }
    } else {
      instance = this._instance;
      if ((instance as Disposable)?.isDisposed?.()) {
        delete this._instance;
      }
    }

    return instance;
  }
}
