/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export { Keyborg, createKeyborg, disposeKeyborg } from "./Keyborg";

export {
  getLastFocusedProgrammatically,
  nativeFocus,
  KEYBORG_FOCUSIN,
  KeyborgFocusInEvent,
  KeyborgFocusInEventDetails,
} from "./FocusEvent";

export const version = __VERSION__;
