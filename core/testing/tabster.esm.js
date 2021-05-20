import { __extends, __assign, __awaiter, __generator } from 'tslib';

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var TabsterAttributeName = 'data-tabster';
var RestoreFocusOrders = {
  History: 0,
  DeloserDefault: 1,
  RootDefault: 2,
  DeloserFirst: 3,
  RootFirst: 4
};
/**
 * Declare the kinds of keyboard movers
 */

var MoverKeys;

(function (MoverKeys) {
  /**
   * Move within a mover block using only tab key
   */
  MoverKeys[MoverKeys["Tab"] = 0] = "Tab";
  /**
   * Move within a mover block using up/left and down/right arrows
   *
   * This is the only mover kind that supports cyclic navigation
   */

  MoverKeys[MoverKeys["Arrows"] = 1] = "Arrows";
  /**
   * Use both tab and arrow keys to move
   */

  MoverKeys[MoverKeys["Both"] = 2] = "Both";
})(MoverKeys || (MoverKeys = {}));

var MoverAxis = {
  Horizontal: 0,
  Vertical: 1
};
var ElementVisibilities = {
  Invisible: 0,
  PartiallyVisible: 1,
  Visible: 2
};
var GroupperFocusLimits = {
  Unlimited: 0,
  Limited: 1,
  LimitedTrapFocus: 2
};
var GroupperNextDirections = {
  Both: 0,
  Vertical: 1,
  Horizontal: 2,
  Grid: 3
};

var Types = {
    __proto__: null,
    TabsterAttributeName: TabsterAttributeName,
    RestoreFocusOrders: RestoreFocusOrders,
    get MoverKeys () { return MoverKeys; },
    MoverAxis: MoverAxis,
    ElementVisibilities: ElementVisibilities,
    GroupperFocusLimits: GroupperFocusLimits,
    GroupperNextDirections: GroupperNextDirections
};

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

var _isBrokenIE11;

var _DOMRect = typeof DOMRect !== 'undefined' ? DOMRect :
/*#__PURE__*/

/** @class */
function () {
  function class_1(x, y, width, height) {
    this.left = x || 0;
    this.top = y || 0;
    this.right = (x || 0) + (width || 0);
    this.bottom = (y || 0) + (height || 0);
  }

  return class_1;
}();

var _uidCounter = 0;

try {
  // IE11 only accepts `filter` argument as a function (not object with the `acceptNode`
  // property as the docs define). Also `entityReferenceExpansion` argument is not
  // optional. And it throws exception when the above arguments aren't there.
  document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
  _isBrokenIE11 = false;
} catch (e) {
  _isBrokenIE11 = true;
}

function getInstanceContext(getWindow) {
  var win = getWindow();
  var ctx = win.__tabsterInstanceContext;

  if (!ctx) {
    ctx = {
      elementByUId: {},
      basics: {
        Promise: win.Promise || undefined,
        WeakRef: win.WeakRef || undefined
      },
      containerBoundingRectCache: {},
      lastContainerBoundingRectCacheId: 0,
      weakElementStorage: {},
      lastWeakElementId: 0,
      weakCleanupStarted: false
    };
    win.__tabsterInstanceContext = ctx;
  }

  return ctx;
}

var FakeWeakRef =
/*#__PURE__*/

/** @class */
function () {
  function FakeWeakRef(target) {
    this._target = target;
  }

  FakeWeakRef.prototype.deref = function () {
    return this._target;
  };

  FakeWeakRef.cleanup = function (fwr) {
    if (!fwr._target) {
      return true;
    }

    if (!documentContains(fwr._target.ownerDocument, fwr._target)) {
      delete fwr._target;
      return true;
    }

    return false;
  };

  return FakeWeakRef;
}();

var WeakHTMLElement =
/*#__PURE__*/

/** @class */
function () {
  function WeakHTMLElement(getWindow, element, data) {
    var context = getInstanceContext(getWindow);
    this._ctx = context;
    this._id = 'we' + ++context.lastWeakElementId;
    context.weakElementStorage[this._id] = context.WeakRef ? new context.WeakRef(element) : new FakeWeakRef(element);

    if (data !== undefined) {
      this._data = data;
    }
  }

  WeakHTMLElement.prototype.get = function () {
    var ref = this._ctx.weakElementStorage[this._id];
    var el = ref && ref.deref();

    if (ref && !el) {
      delete this._ctx.weakElementStorage[this._id];
    }

    return el;
  };

  WeakHTMLElement.prototype.getData = function () {
    return this._data;
  };

  return WeakHTMLElement;
}();
function cleanupWeakRefStorage(getWindow, forceRemove) {
  var context = getInstanceContext(getWindow);

  if (forceRemove) {
    context.weakElementStorage = {};
  } else {
    for (var _i = 0, _a = Object.keys(context.weakElementStorage); _i < _a.length; _i++) {
      var id = _a[_i];
      var we = context.weakElementStorage[id];

      if (context.WeakRef) {
        if (!we.deref()) {
          delete context.weakElementStorage[id];
        }
      } else {
        if (FakeWeakRef.cleanup(we)) {
          delete context.weakElementStorage[id];
        }
      }
    }
  }
}
function startWeakRefStorageCleanup(getWindow) {
  var context = getInstanceContext(getWindow);

  if (!context.weakCleanupStarted) {
    context.weakCleanupStarted = true;
    context.WeakRef = getWeakRef(context);
  }

  if (!context.weakCleanupTimer) {
    context.weakCleanupTimer = getWindow().setTimeout(function () {
      context.weakCleanupTimer = undefined;
      cleanupWeakRefStorage(getWindow);
      startWeakRefStorageCleanup(getWindow);
    }, 2 * 60 * 1000); // 2 minutes.
  }
}
function stopWeakRefStorageCleanupAndClearStorage(getWindow) {
  var context = getInstanceContext(getWindow);
  context.weakCleanupStarted = false;

  if (context.weakCleanupTimer) {
    getWindow().clearTimeout(context.weakCleanupTimer);
    context.weakCleanupTimer = undefined;
    context.weakElementStorage = {};
  }
}
function createElementTreeWalker(doc, root, acceptNode) {
  // IE11 will throw an exception when the TreeWalker root is not an Element.
  if (root.nodeType !== Node.ELEMENT_NODE) {
    return undefined;
  } // TypeScript isn't aware of IE11 behaving badly.


  var filter = _isBrokenIE11 ? acceptNode : {
    acceptNode: acceptNode
  };
  return doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, filter, false
  /* Last argument is not optional for IE11! */
  );
}
function getBoundingRect(getWindow, element) {
  var cacheId = element.__tabsterCacheId;
  var context = getInstanceContext(getWindow);
  var cached = cacheId ? context.containerBoundingRectCache[cacheId] : undefined;

  if (cached) {
    return cached.rect;
  }

  var scrollingElement = element.ownerDocument && element.ownerDocument.documentElement;

  if (!scrollingElement) {
    return new _DOMRect();
  } // A bounding rect of the top-level element contains the whole page regardless of the
  // scrollbar. So, we improvise a little and limiting the final result...


  var left = 0;
  var top = 0;
  var right = scrollingElement.clientWidth;
  var bottom = scrollingElement.clientHeight;

  if (element !== scrollingElement) {
    var r = element.getBoundingClientRect();
    left = Math.max(left, r.left);
    top = Math.max(top, r.top);
    right = Math.min(right, r.right);
    bottom = Math.min(bottom, r.bottom);
  }

  var rect = new _DOMRect(left < right ? left : -1, top < bottom ? top : -1, left < right ? right - left : 0, top < bottom ? bottom - top : 0);

  if (!cacheId) {
    cacheId = 'r-' + ++context.lastContainerBoundingRectCacheId;
    element.__tabsterCacheId = cacheId;
  }

  context.containerBoundingRectCache[cacheId] = {
    rect: rect,
    element: element
  };

  if (!context.containerBoundingRectCacheTimer) {
    context.containerBoundingRectCacheTimer = window.setTimeout(function () {
      context.containerBoundingRectCacheTimer = undefined;

      for (var _i = 0, _a = Object.keys(context.containerBoundingRectCache); _i < _a.length; _i++) {
        var cId = _a[_i];
        delete context.containerBoundingRectCache[cId].element.__tabsterCacheId;
      }

      context.containerBoundingRectCache = {};
    }, 50);
  }

  return rect;
}
function isElementVerticallyVisibleInContainer(getWindow, element) {
  var container = getScrollableContainer(element);

  if (container) {
    var containerRect = getBoundingRect(getWindow, container);
    var elementRect = element.getBoundingClientRect();
    return elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom;
  }

  return false;
}
function isElementVisibleInContainer(getWindow, element, gap) {
  if (gap === void 0) {
    gap = 0;
  }

  var container = getScrollableContainer(element);

  if (container) {
    var containerRect = getBoundingRect(getWindow, container);
    var elementRect = element.getBoundingClientRect();

    if (elementRect.left > containerRect.right || elementRect.top > containerRect.bottom || elementRect.bottom < containerRect.top || elementRect.right < containerRect.left) {
      return ElementVisibilities.Invisible;
    }

    if (elementRect.top + gap >= containerRect.top && elementRect.top <= containerRect.bottom && elementRect.bottom >= containerRect.top && elementRect.bottom - gap <= containerRect.bottom && elementRect.left + gap >= containerRect.left && elementRect.left <= containerRect.right && elementRect.right >= containerRect.left && elementRect.right - gap <= containerRect.right) {
      return ElementVisibilities.Visible;
    }

    return ElementVisibilities.PartiallyVisible;
  }

  return ElementVisibilities.Invisible;
}
function scrollIntoView(getWindow, element, alignToTop) {
  // Built-in DOM's scrollIntoView() is cool, but when we have nested containers,
  // it scrolls all of them, not just the deepest one. So, trying to work it around.
  var container = getScrollableContainer(element);

  if (container) {
    var containerRect = getBoundingRect(getWindow, container);
    var elementRect = element.getBoundingClientRect();

    if (alignToTop) {
      container.scrollTop += elementRect.top - containerRect.top;
    } else {
      container.scrollTop += elementRect.bottom - containerRect.bottom;
    }
  }
}
function getScrollableContainer(element) {
  var doc = element.ownerDocument;

  if (doc) {
    for (var el = element.parentElement; el; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) {
        return el;
      }
    }

    return doc.documentElement;
  }

  return null;
}
function makeFocusIgnored(element) {
  element.__shouldIgnoreFocus = true;
}
function shouldIgnoreFocus(element) {
  return !!element.__shouldIgnoreFocus;
}
function callOriginalFocusOnly(element) {
  var focus = element.focus;

  if (focus.__tabsterFocus) {
    focus.__tabsterFocus.call(element);
  } else {
    element.focus();
  }
}
function getUId(wnd) {
  var rnd = new Uint32Array(4);

  if (wnd.crypto && wnd.crypto.getRandomValues) {
    wnd.crypto.getRandomValues(rnd);
  } else if (wnd.msCrypto && wnd.msCrypto.getRandomValues) {
    wnd.msCrypto.getRandomValues(rnd);
  } else {
    for (var i = 0; i < rnd.length; i++) {
      rnd[i] = 0xffffffff * Math.random();
    }
  }

  var srnd = [];

  for (var i = 0; i < rnd.length; i++) {
    srnd.push(rnd[i].toString(36));
  }

  srnd.push('|');
  srnd.push((++_uidCounter).toString(36));
  srnd.push('|');
  srnd.push(Date.now().toString(36));
  return srnd.join('');
}
function getElementUId(getWindow, element) {
  var context = getInstanceContext(getWindow);
  var uid = element.__tabsterElementUID;

  if (!uid) {
    uid = element.__tabsterElementUID = getUId(getWindow());
  }

  if (!context.elementByUId[uid] && documentContains(element.ownerDocument, element)) {
    context.elementByUId[uid] = new WeakHTMLElement(getWindow, element);
  }

  return uid;
}
function getWindowUId(win) {
  var uid = win.__tabsterCrossOriginWindowUID;

  if (!uid) {
    uid = win.__tabsterCrossOriginWindowUID = getUId(win);
  }

  return uid;
}
function clearElementCache(getWindow, parent) {
  var context = getInstanceContext(getWindow);

  for (var _i = 0, _a = Object.keys(context.elementByUId); _i < _a.length; _i++) {
    var key = _a[_i];
    var wel = context.elementByUId[key];
    var el = wel && wel.get();

    if (el && parent) {
      if (!parent.contains(el)) {
        continue;
      }
    }

    delete context.elementByUId[key];
  }
} // IE11 doesn't have document.contains()...

function documentContains(doc, element) {
  var _a;

  return !!((_a = doc === null || doc === void 0 ? void 0 : doc.body) === null || _a === void 0 ? void 0 : _a.contains(element));
}
function matchesSelector(element, selector) {
  var matches = element.matches || element.matchesSelector || element.msMatchesSelector || element.webkitMatchesSelector;
  return matches && matches.call(element, selector);
}
function getPromise(getWindow) {
  var context = getInstanceContext(getWindow);

  if (context.basics.Promise) {
    return context.basics.Promise;
  }

  throw new Error('No Promise defined.');
}
function getWeakRef(context) {
  return context.basics.WeakRef;
}
function setBasics(win, basics) {
  var context = getInstanceContext(function () {
    return win;
  });
  var key;
  key = 'Promise';

  if (key in basics) {
    context.basics[key] = basics[key];
  }

  key = 'WeakRef';

  if (key in basics) {
    context.basics[key] = basics[key];
  }
}

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function setTabsterOnElement(tabster, element, tabsterOnElement) {
  var uid = element.__tabsterElementUID;
  var entry = uid ? tabster.storageEntry(uid) : undefined;
  var cur = (entry === null || entry === void 0 ? void 0 : entry.tabster) || {};
  var attr = entry === null || entry === void 0 ? void 0 : entry.attr;
  var attrObject;

  if (attr) {
    attrObject = attr.object;
  } else {
    attrObject = {};
  }

  Object.keys(tabsterOnElement).forEach(function (key) {
    var h = tabsterOnElement[key];

    if (h === undefined) {
      if (cur) {
        delete cur[key];
        delete attrObject[key];
      }
    } else {
      switch (key) {
        case 'deloser':
          cur[key] = tabsterOnElement.deloser;
          attrObject[key] = h.getBasicProps();
          break;

        case 'root':
          cur[key] = tabsterOnElement.root;
          attrObject[key] = h.getBasicProps();
          break;

        case 'modalizer':
          cur[key] = tabsterOnElement.modalizer;
          attrObject[key] = h.getBasicProps();
          break;

        case 'focusable':
          cur[key] = attrObject[key] = tabsterOnElement.focusable;
          break;

        case 'groupper':
          cur[key] = tabsterOnElement.groupper;
          attrObject[key] = h.getBasicProps();
          break;

        case 'uberGroupper':
          cur[key] = tabsterOnElement.uberGroupper;
          attrObject[key] = true;
          break;

        case 'observed':
          cur[key] = attrObject[key] = tabsterOnElement.observed;
          break;

        case 'outline':
          cur[key] = attrObject[key] = tabsterOnElement.outline;
          break;

        default:
          throw new Error('Unknown Tabster part.');
      }
    }
  });

  if (Object.keys(cur).length === 0) {
    if (uid && entry) {
      delete entry.tabster;
      delete entry.attr;
      tabster.storageEntry(uid, false);
    }

    element.removeAttribute(TabsterAttributeName);
  } else {
    var attrStr = JSON.stringify(attrObject);

    if (!entry) {
      if (!uid) {
        uid = getElementUId(tabster.getWindow, element);
      }

      entry = tabster.storageEntry(uid, true);
    }

    entry.tabster = cur;
    entry.attr = {
      string: attrStr,
      object: attrObject,
      changing: true
    };

    if (!attr || attr.string !== attrStr) {
      element.setAttribute(TabsterAttributeName, entry.attr.string);
    }

    entry.attr.changing = false;
  }
}
function getTabsterOnElement(tabster, element) {
  var _a;

  var uid = element.__tabsterElementUID;
  return uid ? (_a = tabster.storageEntry(uid)) === null || _a === void 0 ? void 0 : _a.tabster : undefined;
}
function updateTabsterByAttribute(tabster, element) {
  var _a;

  var newAttrValue = element.getAttribute(TabsterAttributeName);
  var tabsteri = tabster;
  var uid = element.__tabsterElementUID;
  var entry = uid ? tabsteri.storageEntry(uid) : undefined;
  var newAttr = entry === null || entry === void 0 ? void 0 : entry.attr;
  var tabsterOnElement = entry === null || entry === void 0 ? void 0 : entry.tabster;

  if (newAttrValue) {
    if (newAttrValue !== (newAttr && newAttr.string)) {
      try {
        var newValue = JSON.parse(newAttrValue);

        if (typeof newValue !== 'object') {
          throw new Error("Value is not a JSON object, got '" + newAttrValue + "'.");
        }

        newAttr = {
          string: newAttrValue,
          object: newValue,
          changing: false
        };
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error(e);
        }
      }
    }
  } else if (tabsterOnElement) {
    newAttr = undefined;
  }

  var oldObject = ((_a = entry === null || entry === void 0 ? void 0 : entry.attr) === null || _a === void 0 ? void 0 : _a.object) || {};
  var newObject = newAttr && newAttr.object || {};

  for (var _i = 0, _b = Object.keys(oldObject); _i < _b.length; _i++) {
    var key = _b[_i];

    if (!newObject[key]) {
      switch (key) {
        case 'deloser':
          if (tabsteri.deloser) {
            tabsteri.deloser.remove(element);
          }

          break;

        case 'root':
          tabster.root.remove(element);
          break;

        case 'modalizer':
          if (tabsteri.modalizer) {
            tabsteri.modalizer.remove(element);
          }

          break;

        case 'focusable':
          tabster.focusable.setProps(element, null);
          break;

        case 'groupper':
          tabster.focusable.removeGroupper(element);
          break;

        case 'uberGroupper':
          break;

        case 'observed':
          if (tabsteri.observedElement) {
            tabsteri.observedElement.remove(element);
          }

          break;

        case 'outline':
          if (tabsteri.outline) {
            tabsteri.outline.setProps(element, null);
          }

          break;
      }
    }
  }

  for (var _c = 0, _d = Object.keys(newObject); _c < _d.length; _c++) {
    var key = _d[_c];

    switch (key) {
      case 'deloser':
        if (tabsterOnElement && tabsterOnElement.deloser) {
          tabsterOnElement.deloser.setProps(newObject.deloser);
        } else {
          if (tabsteri.deloser) {
            tabsteri.deloser.add(element, newObject.deloser);
          }

          if (!tabsteri.deloser && process.env.NODE_ENV !== "production") {
            console.error('Deloser API used before initializing, please call `getDeloser`');
          }
        }

        break;

      case 'root':
        if (tabsterOnElement && tabsterOnElement.root) {
          tabsterOnElement.root.setProps(newObject.root);
        } else {
          tabster.root.add(element);
        }

        break;

      case 'modalizer':
        if (tabsterOnElement && tabsterOnElement.modalizer) {
          tabsterOnElement.modalizer.setProps(newObject.modalizer);
        } else {
          if (tabsteri.modalizer) {
            tabsteri.modalizer.add(element, newObject.modalizer);
          }

          if (!tabsteri.modalizer && process.env.NODE_ENV !== "production") {
            console.error('Modalizer API used before initializing, please call `getDeloser`');
          }
        }

        break;

      case 'focusable':
        tabster.focusable.setProps(element, newObject.focusable || null);
        break;

      case 'groupper':
        if (tabsterOnElement && tabsterOnElement.groupper) {
          tabsterOnElement.groupper.setProps(newObject.groupper);
        } else {
          tabster.focusable.addGroupper(element, newObject.groupper);
        }

        break;

      case 'uberGroupper':
        break;

      case 'observed':
        if (tabsteri.observedElement) {
          if (tabsterOnElement && tabsterOnElement.observed) {
            tabsteri.observedElement.setProps(element, newObject.observed);
          } else {
            tabsteri.observedElement.add(element, newObject.observed);
          }
        }

        break;

      case 'outline':
        if (tabsteri.outline) {
          tabsteri.outline.setProps(element, newObject.outline || null);
        }

        break;

      default:
        delete newObject[key];
        console.error("Unknown key '" + key + "' in data-tabster attribute value.");
    }
  }

  if (newAttr) {
    newAttr.object = newObject;
    newAttr.string = JSON.stringify(newObject);
    newAttr.changing = true;

    if (!entry) {
      if (!uid) {
        uid = getElementUId(tabster.getWindow, element);
      }

      entry = tabster.storageEntry(uid, true);
    }

    entry.attr = newAttr;

    if (newAttr.string !== newAttrValue) {
      element.setAttribute(TabsterAttributeName, newAttr.string);
    }

    newAttr.changing = false;
  }
}
function augmentAttribute(tabster, element, name, value // Restore original value when undefined.
) {
  var uid = getElementUId(tabster.getWindow, element);
  var entry = tabster.storageEntry(uid, true);

  if (!entry.aug) {
    if (value === undefined) {
      return;
    }

    entry.aug = {};
  }

  if (value === undefined) {
    if (name in entry.aug) {
      var origVal = entry.aug[name];
      delete entry.aug[name];

      if (origVal === null) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, origVal);
      }
    }
  } else {
    if (!(name in entry.aug)) {
      entry.aug[name] = element.getAttribute(name);
    }

    if (value === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  }

  if (value === undefined && Object.keys(entry.aug).length === 0) {
    delete entry.aug;
    tabster.storageEntry(uid, false);
  }
}

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var Keys = {
  Tab: 9,
  Enter: 13,
  Esc: 27,
  Space: 32,
  PageUp: 33,
  PageDown: 34,
  End: 35,
  Home: 36,
  Left: 37,
  Up: 38,
  Right: 39,
  Down: 40
};

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var Subscribable =
/*#__PURE__*/

/** @class */
function () {
  function Subscribable() {
    this._callbacks = [];
  }

  Subscribable.prototype.dispose = function () {
    this._callbacks = [];
    delete this._val;
  };

  Subscribable.prototype.subscribe = function (callback) {
    var index = this._callbacks.indexOf(callback);

    if (index < 0) {
      this._callbacks.push(callback);
    }
  };

  Subscribable.prototype.unsubscribe = function (callback) {
    var index = this._callbacks.indexOf(callback);

    if (index >= 0) {
      this._callbacks.splice(index, 1);
    }
  };

  Subscribable.prototype.setVal = function (val, details) {
    if (this._val === val) {
      return;
    }

    this._val = val;

    this._callCallbacks(val, details);
  };

  Subscribable.prototype.getVal = function () {
    return this._val;
  };

  Subscribable.prototype.trigger = function (val, details) {
    this._callCallbacks(val, details);
  };

  Subscribable.prototype._callCallbacks = function (val, details) {
    this._callbacks.forEach(function (callback) {
      return callback(val, details);
    });
  };

  return Subscribable;
}();

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var _dismissTimeout = 500; // When Esc is pressed and the focused is not moved
// during _dismissTimeout time, dismiss the keyboard
// navigation mode.

var KeyboardNavigationState =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(KeyboardNavigationState, _super);

  function KeyboardNavigationState(tabster, getWindow) {
    var _this = _super.call(this) || this;

    _this._isMouseUsed = false;

    _this._init = function () {
      _this._initTimer = undefined;

      var win = _this._win();

      win.document.body.addEventListener('mousedown', _this._onMouseDown, true); // Capture!

      win.addEventListener('keydown', _this._onKeyDown, true); // Capture!

      _this._tabster.focusedElement.subscribe(_this._onFocus);
    };

    _this._onMouseDown = function (e) {
      if (e.buttons === 0 || e.clientX === 0 && e.clientY === 0 && e.screenX === 0 && e.screenY === 0) {
        // This is most likely an event triggered by the screen reader to perform
        // an action on an element, do not dismiss the keyboard navigation mode.
        return;
      }

      _this._isMouseUsed = true;

      _this.setVal(false, undefined);
    };

    _this._onKeyDown = function (e) {
      var isNavigatingWithKeyboard = _this.isNavigatingWithKeyboard();

      if (!isNavigatingWithKeyboard && e.keyCode === Keys.Tab) {
        _this.setVal(true, undefined);
      } else if (isNavigatingWithKeyboard && e.keyCode === Keys.Esc) {
        _this._scheduleDismiss();
      }
    };

    _this._onFocus = function (e, d) {
      if (!e) {
        return;
      }

      if (_this._isMouseUsed) {
        _this._isMouseUsed = false;
        return;
      }

      if (_this.isNavigatingWithKeyboard()) {
        return;
      }

      if (!d.relatedTarget) {
        return;
      }

      if (d.isFocusedProgrammatically || d.isFocusedProgrammatically === undefined) {
        // The element is focused programmatically, or the programmatic focus detection
        // is not working.
        return;
      }

      _this.setVal(true, undefined);
    };

    _this._tabster = tabster;
    _this._win = getWindow;
    _this._initTimer = getWindow().setTimeout(_this._init, 0);
    return _this;
  }

  KeyboardNavigationState.prototype.dispose = function () {
    _super.prototype.dispose.call(this);

    var win = this._win();

    if (this._initTimer) {
      win.clearTimeout(this._initTimer);
      this._initTimer = undefined;
    }

    if (this._dismissTimer) {
      win.clearTimeout(this._dismissTimer);
      this._dismissTimer = undefined;
    }

    win.document.body.removeEventListener('mousedown', this._onMouseDown, true);
    win.removeEventListener('keydown', this._onKeyDown, true);

    this._tabster.focusedElement.unsubscribe(this._onFocus);
  };

  KeyboardNavigationState.dispose = function (instance) {
    instance.dispose();
  };

  KeyboardNavigationState.prototype.isNavigatingWithKeyboard = function () {
    return this.getVal() || false;
  };

  KeyboardNavigationState.prototype._scheduleDismiss = function () {
    var _this = this;

    var win = this._win();

    if (this._dismissTimer) {
      win.clearTimeout(this._dismissTimer);
      this._dismissTimer = undefined;
    }

    var was = this._tabster.focusedElement.getFocusedElement();

    this._dismissTimer = win.setTimeout(function () {
      _this._dismissTimer = undefined;

      var cur = _this._tabster.focusedElement.getFocusedElement();

      if (was && cur && was === cur) {
        // Esc was pressed, currently focused element hasn't changed.
        // Just dismiss the keyboard navigation mode.
        _this.setVal(false, undefined);
      }
    }, _dismissTimeout);
  };

  KeyboardNavigationState.setVal = function (instance, val) {
    instance.setVal(val, undefined);
  };

  return KeyboardNavigationState;
}(Subscribable);

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var MUTATION_EVENT_NAME = 'tabster:mutation-event';
function observeMutations(doc, tabster, updateTabsterByAttribute) {
  if (typeof MutationObserver === 'undefined') {
    return function () {};
  }

  var observer = new MutationObserver(function (mutations) {
    var _a;

    var changedRoots = {};
    var changedModalizers = {};
    var changedGrouppers = {};
    var changedObservedElements = {};

    for (var _i = 0, mutations_1 = mutations; _i < mutations_1.length; _i++) {
      var mutation = mutations_1[_i];
      var target = mutation.target;
      var removed = mutation.removedNodes;
      var added = mutation.addedNodes;

      if (mutation.type === 'attributes') {
        if (mutation.attributeName === TabsterAttributeName) {
          var uid = target.__tabsterElementUID;
          var tabsterAttr = uid ? (_a = tabster.storageEntry(uid)) === null || _a === void 0 ? void 0 : _a.attr : undefined;

          if (!tabsterAttr || !tabsterAttr.changing) {
            updateTabsterByAttribute(tabster, target);
          }
        }
      } else {
        var tabsterOnElement = getTabsterOnElement(tabster, target);
        var root = tabsterOnElement && tabsterOnElement.root;

        if (root) {
          changedRoots[root.uid] = {
            root: root,
            addedTo: target
          };
        }

        for (var i = 0; i < removed.length; i++) {
          findTargets(removed[i], target.ownerDocument || doc);
        }

        for (var i = 0; i < added.length; i++) {
          findTargets(added[i], undefined, target);
        }
      }
    }

    for (var _b = 0, _c = Object.keys(changedRoots); _b < _c.length; _b++) {
      var id = _c[_b];
      var r = changedRoots[id];

      if (r.removedFrom) {
        dispatchMutationEvent(r.removedFrom, {
          root: r.root,
          removed: true,
          isMutation: true
        });
      }

      if (r.addedTo) {
        dispatchMutationEvent(r.addedTo, {
          root: r.root,
          removed: false,
          isMutation: true
        });
      }
    }

    for (var _d = 0, _e = Object.keys(changedModalizers); _d < _e.length; _d++) {
      var id = _e[_d];
      var l = changedModalizers[id];

      if (l.removedFrom) {
        dispatchMutationEvent(l.removedFrom, {
          modalizer: l.modalizer,
          removed: true,
          isMutation: true
        });
      }

      if (l.addedTo) {
        dispatchMutationEvent(l.addedTo, {
          modalizer: l.modalizer,
          removed: false,
          isMutation: true
        });
      }
    }

    for (var _f = 0, _g = Object.keys(changedGrouppers); _f < _g.length; _f++) {
      var id = _g[_f];
      var g = changedGrouppers[id];

      if (g.removedFrom && !g.addedTo) {
        dispatchMutationEvent(g.removedFrom, {
          groupper: g.groupper,
          removed: true,
          isMutation: true
        });
      }

      if (g.addedTo) {
        dispatchMutationEvent(g.addedTo, {
          groupper: g.groupper,
          removed: false,
          isMutation: true
        });
      }
    }

    for (var _h = 0, _j = Object.keys(changedObservedElements); _h < _j.length; _h++) {
      var id = _j[_h];
      var e = changedObservedElements[id];

      if (e.removedFrom && !e.addedTo) {
        dispatchMutationEvent(e.removedFrom, {
          observed: e.element,
          removed: true,
          isMutation: true
        });
      }

      if (e.addedTo) {
        dispatchMutationEvent(e.addedTo, {
          observed: e.element,
          removed: false,
          isMutation: true
        });
      }
    }

    function findTargets(node, removedFrom, addedTo) {
      acceptNode(node, removedFrom, addedTo);
      var walker = createElementTreeWalker(doc, node, function (element) {
        return acceptNode(element, removedFrom, addedTo);
      });

      if (walker) {
        while (walker.nextNode()) {
          /* Iterating for the sake of calling acceptNode callback. */
        }
      }
    }

    function acceptNode(element, removedFrom, addedTo) {
      if (!element.getAttribute) {
        // It might actually be a text node.
        return NodeFilter.FILTER_SKIP;
      }

      var uid = element.__tabsterElementUID;

      if (uid) {
        var getWindow = tabster.getWindow;
        var instanceContext = getInstanceContext(getWindow);

        if (removedFrom) {
          delete instanceContext.elementByUId[uid];
        } else if (addedTo) {
          instanceContext.elementByUId[uid] = new WeakHTMLElement(getWindow, element);
        }
      }

      var tabsterOnElement = getTabsterOnElement(tabster, element);

      if (tabsterOnElement) {
        if (tabsterOnElement.root) {
          addRootTarget(tabsterOnElement.root, removedFrom, addedTo);
        }

        if (tabsterOnElement.modalizer) {
          addModalizerTarget(tabsterOnElement.modalizer, removedFrom, addedTo);
        }

        if (tabsterOnElement.groupper) {
          addGroupTarget(element, tabsterOnElement.groupper, removedFrom, addedTo);
        }

        if (tabsterOnElement.observed) {
          addObservedElementTarget(element, removedFrom, addedTo);
        }
      } else if (element.getAttribute(TabsterAttributeName)) {
        updateTabsterByAttribute(tabster, element);
      }

      return NodeFilter.FILTER_SKIP;
    }

    function addRootTarget(root, removedFrom, addedTo) {
      var r = changedRoots[root.uid];

      if (!r) {
        r = changedRoots[root.uid] = {
          root: root
        };
      }

      if (removedFrom) {
        r.removedFrom = removedFrom;
      }

      if (addedTo) {
        r.addedTo = addedTo;
      }
    }

    function addModalizerTarget(modalizer, removedFrom, addedTo) {
      var m = changedModalizers[modalizer.internalId];

      if (!m) {
        m = changedModalizers[modalizer.internalId] = {
          modalizer: modalizer
        };
      }

      if (removedFrom) {
        m.removedFrom = removedFrom;
      }

      if (addedTo) {
        m.addedTo = addedTo;
      }
    }

    function addGroupTarget(el, groupper, removedFrom, addedTo) {
      var g = changedGrouppers[groupper.id];

      if (!g) {
        g = changedGrouppers[groupper.id] = {
          groupper: groupper
        };
      }

      if (removedFrom) {
        g.removedFrom = removedFrom;
      }

      if (addedTo) {
        g.addedTo = addedTo;
      }
    }

    function addObservedElementTarget(element, removedFrom, addedTo) {
      if (!doc.defaultView) {
        return;
      }

      var uid = getElementUId(tabster.getWindow, element);
      var e = changedObservedElements[uid];

      if (!e) {
        e = changedObservedElements[uid] = {
          element: element
        };
      }

      if (removedFrom) {
        e.removedFrom = removedFrom;
      }

      if (addedTo) {
        e.addedTo = addedTo;
      }
    }
  });
  observer.observe(doc, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [TabsterAttributeName]
  });
  return function () {
    observer.disconnect();
  };
}
function dispatchMutationEvent(target, details) {
  var event = document.createEvent('HTMLEvents');
  event.initEvent(MUTATION_EVENT_NAME, true, true);
  event.details = details;
  target.dispatchEvent(event);
}

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

function _setInformativeStyle(weakElement, remove, id) {
  if (process.env.NODE_ENV !== "production") {
    var element = weakElement.get();

    if (element) {
      if (remove) {
        element.style.removeProperty('--tabster-root');
      } else {
        element.style.setProperty('--tabster-root', id + ',');
      }
    }
  }
}

var Root =
/*#__PURE__*/

/** @class */
function () {
  function Root(element, tabster, win, forgetFocusedGrouppers, basic) {
    this.uid = getElementUId(win, element);
    this._element = new WeakHTMLElement(win, element);
    this._tabster = tabster;
    this._win = win;
    this._basic = basic || {};
    this._forgetFocusedGrouppers = forgetFocusedGrouppers;
    this._dummyInputFirst = {
      isFirst: true
    };
    this._dummyInputLast = {
      isFirst: false
    };

    this._createDummyInput(this._dummyInputFirst);

    this._createDummyInput(this._dummyInputLast);

    this._add();

    this._addDummyInputs();
  }

  Root.prototype.dispose = function () {
    this._remove();

    var dif = this._dummyInputFirst;

    if (dif) {
      this._disposeDummyInput(dif);

      delete this._dummyInputFirst;
    }

    var dil = this._dummyInputLast;

    if (dil) {
      this._disposeDummyInput(dil);

      delete this._dummyInputLast;
    }

    this._forgetFocusedGrouppers = function () {};
  };

  Root.prototype.setProps = function (basic) {
    if (basic) {
      this._basic = __assign(__assign({}, this._basic), basic);
    } else if (basic === null) {
      this._basic = {};
    }
  };

  Root.prototype.getBasicProps = function () {
    return this._basic;
  };

  Root.prototype.move = function (newElement) {
    this._remove();

    this._element = new WeakHTMLElement(this._win, newElement);

    this._add();
  };

  Root.prototype.getElement = function () {
    return this._element.get();
  };

  Root.prototype.updateDummyInputs = function () {
    this._addDummyInputs();
  };

  Root.prototype.moveOutWithDefaultAction = function (backwards) {
    var _a, _b;

    if (((_a = this._dummyInputFirst) === null || _a === void 0 ? void 0 : _a.input) && ((_b = this._dummyInputLast) === null || _b === void 0 ? void 0 : _b.input)) {
      if (backwards) {
        this._dummyInputFirst.shouldMoveOut = true;
        callOriginalFocusOnly(this._dummyInputFirst.input);
      } else {
        this._dummyInputLast.shouldMoveOut = true;
        callOriginalFocusOnly(this._dummyInputLast.input);
      }
    }
  };

  Root.prototype._add = function () {
    if (process.env.NODE_ENV !== "production") {
      _setInformativeStyle(this._element, false, this.uid);
    }
  };

  Root.prototype._remove = function () {
    this._removeDummyInputs();

    if (process.env.NODE_ENV !== "production") {
      _setInformativeStyle(this._element, true);
    }
  };

  Root.prototype._createDummyInput = function (props) {
    var _this = this;

    if (props.input) {
      return;
    }

    var input = this._win().document.createElement('div');

    input.tabIndex = 0;
    input.setAttribute('role', 'none');
    input.setAttribute('aria-hidden', 'true');
    var style = input.style;
    style.position = 'fixed';
    style.width = style.height = '1px';
    style.left = style.top = '-100500px';
    style.opacity = '0';
    style.zIndex = '-1';

    if (process.env.NODE_ENV !== "production") {
      style.setProperty('--tabster-dummy-input', props.isFirst ? 'first' : 'last');
    }

    makeFocusIgnored(input);
    props.input = input;

    props.focusin = function (e) {
      var _a;

      if (props.shouldMoveOut) ; else {
        // The only way a dummy input gets focused is during the keyboard navigation.
        KeyboardNavigationState.setVal(_this._tabster.keyboardNavigation, true);

        _this._forgetFocusedGrouppers();

        var element = _this._element.get();

        var toFocus = void 0;

        if (element) {
          toFocus = props.isFirst ? _this._tabster.focusable.findFirst(element) : _this._tabster.focusable.findLast(element);
        } else {
          toFocus = null;
        }

        if (toFocus) {
          _this._tabster.focusedElement.focus(toFocus);
        } else {
          (_a = props.input) === null || _a === void 0 ? void 0 : _a.blur();
        }
      }
    };

    props.focusout = function (e) {
      props.shouldMoveOut = false;
    };

    input.addEventListener('focusin', props.focusin);
    input.addEventListener('focusout', props.focusout);
  };

  Root.prototype._disposeDummyInput = function (props) {
    var input = props.input;

    if (!input) {
      return;
    }

    delete props.input;
    var fi = props.focusin;

    if (fi) {
      input.removeEventListener('focusin', fi);
      delete props.focusin;
    }

    var fo = props.focusout;

    if (fo) {
      input.removeEventListener('focusout', fo);
      delete props.focusout;
    }
  };

  Root.prototype._addDummyInputs = function () {
    var _a, _b;

    var element = this._element.get();

    var dif = (_a = this._dummyInputFirst) === null || _a === void 0 ? void 0 : _a.input;
    var dil = (_b = this._dummyInputLast) === null || _b === void 0 ? void 0 : _b.input;

    if (!element || !dif || !dil) {
      return;
    }

    if (element.lastElementChild !== dil) {
      element.appendChild(dil);
    }

    var firstElementChild = element.firstElementChild;

    if (firstElementChild && firstElementChild !== dif) {
      element.insertBefore(dif, firstElementChild);
    }
  };

  Root.prototype._removeDummyInputs = function () {
    var _a, _b;

    var dif = (_a = this._dummyInputFirst) === null || _a === void 0 ? void 0 : _a.input;
    var dil = (_b = this._dummyInputLast) === null || _b === void 0 ? void 0 : _b.input;

    if (dif === null || dif === void 0 ? void 0 : dif.parentElement) {
      dif.parentElement.removeChild(dif);
    }

    if (dil === null || dil === void 0 ? void 0 : dil.parentElement) {
      dil.parentElement.removeChild(dil);
    }
  };

  return Root;
}();

var RootAPI =
/*#__PURE__*/

/** @class */
function () {
  function RootAPI(tabster, forgetFocusedGrouppers, autoRoot) {
    var _this = this;

    this.rootById = {};

    this._init = function () {
      _this._initTimer = undefined;

      var win = _this._win();

      win.document.addEventListener(MUTATION_EVENT_NAME, _this._onMutation);
      _this._unobserve = observeMutationEvents(_this._win);
    };

    this._onMutation = function (e) {
      var details = e.details;
      var root = details.root;

      if (root) {
        if (details.removed) {
          if (details.isMutation) {
            root.dispose();
          }
        } else if (root.getElement() === e.target) {
          root.updateDummyInputs();
        }
      }
    };

    this._tabster = tabster;
    this._win = tabster.getWindow;
    this._forgetFocusedGrouppers = forgetFocusedGrouppers;
    this._initTimer = this._win().setTimeout(this._init, 0);
    this._autoRoot = autoRoot;
  }

  RootAPI.prototype.dispose = function () {
    var win = this._win();

    if (this._autoRootInstance) {
      this._autoRootInstance.dispose();

      delete this._autoRootInstance;
      delete this._autoRoot;
    }

    if (this._initTimer) {
      win.clearTimeout(this._initTimer);
      this._initTimer = undefined;
    }

    win.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation);

    if (this._unobserve) {
      this._unobserve();

      delete this._unobserve;
    }

    this._forgetFocusedGrouppers = function () {};

    this.rootById = {};
  };

  RootAPI.dispose = function (instance) {
    instance.dispose();
  };

  RootAPI.prototype.add = function (element, basic) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);

    if (tabsterOnElement && tabsterOnElement.root) {
      return;
    }

    var root = new Root(element, this._tabster, this._win, this._forgetFocusedGrouppers, basic);
    setTabsterOnElement(this._tabster, element, {
      root: root
    });

    dispatchMutationEvent(element, {
      root: root
    });
  };

  RootAPI.prototype.remove = function (element) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);
    var root = tabsterOnElement && tabsterOnElement.root;

    if (!root) {
      return;
    }

    dispatchMutationEvent(element, {
      root: root,
      removed: true
    });
    setTabsterOnElement(this._tabster, element, {
      root: undefined
    });
    root.dispose();
  };

  RootAPI.prototype.move = function (from, to) {
    var tabsterOnElementFrom = getTabsterOnElement(this._tabster, from);
    var root = tabsterOnElementFrom && tabsterOnElementFrom.root;

    if (root) {
      root.move(to);
      setTabsterOnElement(this._tabster, to, {
        root: root
      });
      setTabsterOnElement(this._tabster, from, {
        root: undefined
      });
      dispatchMutationEvent(from, {
        root: root,
        removed: true
      });
      dispatchMutationEvent(to, {
        root: root
      });
    }
  };

  RootAPI.prototype.setProps = function (element, basic) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);

    if (tabsterOnElement && tabsterOnElement.root) {
      tabsterOnElement.root.setProps(basic);
    }
  };

  RootAPI.getRootByUId = function (getWindow, id) {
    var tabster = getWindow().__tabsterInstance;

    return tabster && tabster.root.rootById[id];
  };
  /**
   * Fetches the tabster context for an element walking up its ancestors
   *
   * @param tabster Tabster instance
   * @param element The element the tabster context should represent
   * @param options Additional options
   * @returns undefined if the element is not a child of a tabster root, otherwise all applicable tabster behaviours and configurations
   */


  RootAPI.getTabsterContext = function (tabster, element, options) {
    var _a, _b;

    if (options === void 0) {
      options = {};
    }

    if (!element.ownerDocument) {
      return undefined;
    }

    var root;
    var modalizer;
    var groupper;
    var mover;
    var moverOptions;
    var isGroupperFirst;
    var isRtl = false;
    var curElement = element;

    while (curElement && (!root || options.checkRtl)) {
      var tabsterOnElement = getTabsterOnElement(tabster, curElement);

      if (!tabsterOnElement) {
        curElement = curElement.parentElement;
        continue;
      }

      if (!groupper && tabsterOnElement.groupper) {
        groupper = tabsterOnElement.groupper;
      }

      var moverOnElement = (_a = tabsterOnElement.focusable) === null || _a === void 0 ? void 0 : _a.mover;

      if (moverOnElement !== undefined && moverOptions === undefined) {
        moverOptions = moverOnElement;

        if (moverOptions.navigationType === MoverKeys.Arrows || moverOptions.navigationType === MoverKeys.Both) {
          mover = curElement;
          isGroupperFirst = !!groupper;
        }
      }

      if (!modalizer && tabsterOnElement.modalizer) {
        modalizer = tabsterOnElement.modalizer;
      }

      if (tabsterOnElement.root) {
        root = tabsterOnElement.root;
      }

      if (curElement.getAttribute('dir') === 'rtl') {
        isRtl = true;
      }

      curElement = curElement.parentElement;
    } // No root element could be found, try to get an auto root


    if (!root && tabster.root._autoRoot) {
      var rootAPI = tabster.root;

      if (!rootAPI._autoRootInstance) {
        var body = (_b = element.ownerDocument) === null || _b === void 0 ? void 0 : _b.body;

        if (body) {
          rootAPI._autoRootInstance = new Root(body, rootAPI._tabster, rootAPI._win, rootAPI._forgetFocusedGrouppers, rootAPI._autoRoot);
        }
      }

      root = rootAPI._autoRootInstance;
    }

    return root ? {
      root: root,
      modalizer: modalizer,
      groupper: groupper,
      mover: mover,
      moverOptions: moverOptions,
      isGroupperFirst: isGroupperFirst,
      isRtl: options.checkRtl ? isRtl : undefined
    } : undefined;
  };

  return RootAPI;
}();

function observeMutationEvents(getWindow) {
  var handler = function handler(e) {
    var root = e.details.root;

    var tabster = getWindow().__tabsterInstance;

    if (tabster && root) {
      if (e.details.removed) {
        delete tabster.root.rootById[root.uid];
      } else {
        tabster.root.rootById[root.uid] = root;
      }
    }
  };

  getWindow().document.addEventListener(MUTATION_EVENT_NAME, handler);
  return function () {
    getWindow().document.removeEventListener(MUTATION_EVENT_NAME, handler);
  };
}

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var _containerHistoryLength = 10;

var DeloserItemBase =
/*#__PURE__*/

/** @class */
function () {
  function DeloserItemBase() {}

  return DeloserItemBase;
}();

var DeloserItem =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(DeloserItem, _super);

  function DeloserItem(tabster, deloser) {
    var _this = _super.call(this) || this;

    _this.uid = deloser.uid;
    _this._tabster = tabster;
    _this._deloser = deloser;
    return _this;
  }

  DeloserItem.prototype.belongsTo = function (deloser) {
    return deloser === this._deloser;
  };

  DeloserItem.prototype.unshift = function (element) {
    this._deloser.unshift(element);
  };

  DeloserItem.prototype.focusAvailable = function () {
    return __awaiter(this, void 0, void 0, function () {
      var available;
      return __generator(this, function (_a) {
        available = this._deloser.findAvailable();
        return [2
        /*return*/
        , available ? this._tabster.focusedElement.focus(available) : false];
      });
    });
  };

  DeloserItem.prototype.resetFocus = function () {
    return __awaiter(this, void 0, void 0, function () {
      var getWindow;
      return __generator(this, function (_a) {
        getWindow = this._tabster.getWindow;
        return [2
        /*return*/
        , getPromise(getWindow).resolve(this._deloser.resetFocus())];
      });
    });
  };

  return DeloserItem;
}(DeloserItemBase);

var DeloserHistoryByRootBase =
/*#__PURE__*/

/** @class */
function () {
  function DeloserHistoryByRootBase(tabster, rootUId) {
    this._history = [];
    this._tabster = tabster;
    this.rootUId = rootUId;
  }

  DeloserHistoryByRootBase.prototype.getLength = function () {
    return this._history.length;
  };

  DeloserHistoryByRootBase.prototype.removeDeloser = function (deloser) {
    this._history = this._history.filter(function (c) {
      return !c.belongsTo(deloser);
    });
  };

  DeloserHistoryByRootBase.prototype.hasDeloser = function (deloser) {
    return this._history.some(function (d) {
      return d.belongsTo(deloser);
    });
  };

  return DeloserHistoryByRootBase;
}();

var DeloserHistoryByRoot =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(DeloserHistoryByRoot, _super);

  function DeloserHistoryByRoot() {
    return _super !== null && _super.apply(this, arguments) || this;
  }

  DeloserHistoryByRoot.prototype.unshiftToDeloser = function (deloser, element) {
    var item;

    for (var i = 0; i < this._history.length; i++) {
      if (this._history[i].belongsTo(deloser)) {
        item = this._history[i];

        this._history.splice(i, 1);

        break;
      }
    }

    if (!item) {
      item = new DeloserItem(this._tabster, deloser);
    }

    item.unshift(element);

    this._history.unshift(item);

    this._history.splice(_containerHistoryLength, this._history.length - _containerHistoryLength);
  };

  DeloserHistoryByRoot.prototype.focusAvailable = function (from) {
    return __awaiter(this, void 0, void 0, function () {
      var skip, _i, _a, i, _b;

      return __generator(this, function (_c) {
        switch (_c.label) {
          case 0:
            skip = !!from;
            _i = 0, _a = this._history;
            _c.label = 1;

          case 1:
            if (!(_i < _a.length)) return [3
            /*break*/
            , 5];
            i = _a[_i];

            if (from && i.belongsTo(from)) {
              skip = false;
            }

            _b = !skip;
            if (!_b) return [3
            /*break*/
            , 3];
            return [4
            /*yield*/
            , i.focusAvailable()];

          case 2:
            _b = _c.sent();
            _c.label = 3;

          case 3:
            if (_b) {
              return [2
              /*return*/
              , true];
            }

            _c.label = 4;

          case 4:
            _i++;
            return [3
            /*break*/
            , 1];

          case 5:
            return [2
            /*return*/
            , false];
        }
      });
    });
  };

  DeloserHistoryByRoot.prototype.resetFocus = function (from) {
    return __awaiter(this, void 0, void 0, function () {
      var skip, resetQueue, _i, _a, i, _b, _c, id;

      return __generator(this, function (_d) {
        switch (_d.label) {
          case 0:
            skip = !!from;
            resetQueue = {};

            for (_i = 0, _a = this._history; _i < _a.length; _i++) {
              i = _a[_i];

              if (from && i.belongsTo(from)) {
                skip = false;
              }

              if (!skip && !resetQueue[i.uid]) {
                resetQueue[i.uid] = i;
              }
            }

            _b = 0, _c = Object.keys(resetQueue);
            _d.label = 1;

          case 1:
            if (!(_b < _c.length)) return [3
            /*break*/
            , 4];
            id = _c[_b];
            return [4
            /*yield*/
            , resetQueue[id].resetFocus()];

          case 2:
            if (_d.sent()) {
              return [2
              /*return*/
              , true];
            }

            _d.label = 3;

          case 3:
            _b++;
            return [3
            /*break*/
            , 1];

          case 4:
            return [2
            /*return*/
            , false];
        }
      });
    });
  };

  return DeloserHistoryByRoot;
}(DeloserHistoryByRootBase);

var DeloserHistory =
/*#__PURE__*/

/** @class */
function () {
  function DeloserHistory(tabster) {
    this._history = [];
    this._tabster = tabster;
  }

  DeloserHistory.prototype.dispose = function () {
    this._history = [];
  };

  DeloserHistory.prototype.process = function (element) {
    var _this = this;

    var _a;

    var ctx = RootAPI.getTabsterContext(this._tabster, element);
    var rootUId = ctx && ctx.root.uid;
    var deloser = DeloserAPI.getDeloser(this._tabster, element);

    if (!rootUId || !deloser) {
      return undefined;
    }

    var historyByRoot = this.make(rootUId, function () {
      return new DeloserHistoryByRoot(_this._tabster, rootUId);
    });

    if (!ctx || !ctx.modalizer || ((_a = ctx.modalizer) === null || _a === void 0 ? void 0 : _a.isActive())) {
      historyByRoot.unshiftToDeloser(deloser, element);
    }

    return deloser;
  };

  DeloserHistory.prototype.make = function (rootUId, createInstance) {
    var historyByRoot;

    for (var i = 0; i < this._history.length; i++) {
      var hbr = this._history[i];

      if (hbr.rootUId === rootUId) {
        historyByRoot = hbr;

        this._history.splice(i, 1);

        break;
      }
    }

    if (!historyByRoot) {
      historyByRoot = createInstance();
    }

    this._history.unshift(historyByRoot);

    this._history.splice(_containerHistoryLength, this._history.length - _containerHistoryLength);

    return historyByRoot;
  };

  DeloserHistory.prototype.removeDeloser = function (deloser) {
    this._history.forEach(function (i) {
      i.removeDeloser(deloser);
    });

    this._history = this._history.filter(function (i) {
      return i.getLength() > 0;
    });
  };

  DeloserHistory.prototype.focusAvailable = function (from) {
    return __awaiter(this, void 0, void 0, function () {
      var skip, _i, _a, h, _b;

      return __generator(this, function (_c) {
        switch (_c.label) {
          case 0:
            skip = !!from;
            _i = 0, _a = this._history;
            _c.label = 1;

          case 1:
            if (!(_i < _a.length)) return [3
            /*break*/
            , 5];
            h = _a[_i];

            if (from && h.hasDeloser(from)) {
              skip = false;
            }

            _b = !skip;
            if (!_b) return [3
            /*break*/
            , 3];
            return [4
            /*yield*/
            , h.focusAvailable(from)];

          case 2:
            _b = _c.sent();
            _c.label = 3;

          case 3:
            if (_b) {
              return [2
              /*return*/
              , true];
            }

            _c.label = 4;

          case 4:
            _i++;
            return [3
            /*break*/
            , 1];

          case 5:
            return [2
            /*return*/
            , false];
        }
      });
    });
  };

  DeloserHistory.prototype.resetFocus = function (from) {
    return __awaiter(this, void 0, void 0, function () {
      var skip, _i, _a, h, _b;

      return __generator(this, function (_c) {
        switch (_c.label) {
          case 0:
            skip = !!from;
            _i = 0, _a = this._history;
            _c.label = 1;

          case 1:
            if (!(_i < _a.length)) return [3
            /*break*/
            , 5];
            h = _a[_i];

            if (from && h.hasDeloser(from)) {
              skip = false;
            }

            _b = !skip;
            if (!_b) return [3
            /*break*/
            , 3];
            return [4
            /*yield*/
            , h.resetFocus(from)];

          case 2:
            _b = _c.sent();
            _c.label = 3;

          case 3:
            if (_b) {
              return [2
              /*return*/
              , true];
            }

            _c.label = 4;

          case 4:
            _i++;
            return [3
            /*break*/
            , 1];

          case 5:
            return [2
            /*return*/
            , false];
        }
      });
    });
  };

  return DeloserHistory;
}();

function _setInformativeStyle$1(weakElement, remove, isActive, snapshotIndex) {
  if (process.env.NODE_ENV !== "production") {
    var element = weakElement.get();

    if (element) {
      if (remove) {
        element.style.removeProperty('--tabster-deloser');
      } else {
        element.style.setProperty('--tabster-deloser', (isActive ? 'active' : 'inactive') + ',' + ('snapshot-' + snapshotIndex));
      }
    }
  }
}

function buildElementSelector(element, withClass, withIndex) {
  var selector = [];
  var escapeRegExp = /(:|\.|\[|\]|,|=|@)/g;
  var escapeReplaceValue = '\\$1';

  if (element.id) {
    selector.push('#' + element.id.replace(escapeRegExp, escapeReplaceValue));
  }

  if (withClass !== false && element.className) {
    element.className.split(' ').forEach(function (cls) {
      cls = cls.trim();

      if (cls) {
        selector.push('.' + cls.replace(escapeRegExp, escapeReplaceValue));
      }
    });
  }

  var index = 0;
  var el;

  if (withIndex !== false && selector.length === 0) {
    el = element;

    while (el) {
      index++;
      el = el.previousElementSibling;
    }

    selector.unshift(':nth-child(' + index + ')');
  }

  selector.unshift(element.tagName.toLowerCase());
  return selector.join('');
}

function buildSelector(element) {
  if (!documentContains(element.ownerDocument, element)) {
    return undefined;
  }

  var selector = [buildElementSelector(element)];
  var el = element.parentElement;

  while (el) {
    var isBody = el.tagName === 'BODY';
    selector.unshift(buildElementSelector(el, false, !isBody));

    if (isBody) {
      break;
    }

    el = el.parentElement;
  }

  return selector.join(' ');
}

var Deloser =
/*#__PURE__*/

/** @class */
function () {
  function Deloser(element, tabster, getWindow, basic, extended) {
    var _this = this;

    this._isActive = false;
    this._history = [[]];
    this._snapshotIndex = 0;

    this.isActive = function () {
      return _this._isActive;
    };

    this.setSnapshot = function (index) {
      _this._snapshotIndex = index;

      if (_this._history.length > index + 1) {
        _this._history.splice(index + 1, _this._history.length - index - 1);
      }

      if (!_this._history[index]) {
        _this._history[index] = [];
      }

      if (process.env.NODE_ENV !== "production") {
        _setInformativeStyle$1(_this._element, false, _this._isActive, _this._snapshotIndex);
      }
    };

    this.focusFirst = function () {
      var e = _this._element.get();

      return !!e && _this._tabster.focusedElement.focusFirst(e);
    };

    this.focusDefault = function () {
      var e = _this._element.get();

      return !!e && _this._tabster.focusedElement.focusDefault(e);
    };

    this.resetFocus = function () {
      var e = _this._element.get();

      return !!e && _this._tabster.focusedElement.resetFocus(e);
    };

    this.clearHistory = function (preserveExisting) {
      var element = _this._element.get();

      if (!element) {
        _this._history[_this._snapshotIndex] = [];
        return;
      }

      _this._history[_this._snapshotIndex] = _this._history[_this._snapshotIndex].filter(function (we) {
        var e = we.get();
        return e && preserveExisting ? element.contains(e) : false;
      });
    };

    this.uid = getElementUId(getWindow, element);
    this._win = getWindow;
    this._tabster = tabster;
    this._element = new WeakHTMLElement(getWindow, element);
    this._basic = basic || {};
    this._extended = extended || {};

    if (process.env.NODE_ENV !== "production") {
      _setInformativeStyle$1(this._element, false, this._isActive, this._snapshotIndex);
    }
  }

  Deloser.prototype.setProps = function (basic, extended) {
    if (basic) {
      this._basic = __assign(__assign({}, this._basic), basic);
    } else if (basic === null) {
      this._basic = {};
    }

    if (extended) {
      this._extended = __assign(__assign({}, this._extended), extended);
    } else if (extended === null) {
      this._extended = {};
    }
  };

  Deloser.prototype.getBasicProps = function () {
    return this._basic;
  };

  Deloser.prototype.move = function (newContainer) {
    this._remove();

    this._element = new WeakHTMLElement(this._win, newContainer);

    if (process.env.NODE_ENV !== "production") {
      _setInformativeStyle$1(this._element, false, this._isActive, this._snapshotIndex);
    }
  };

  Deloser.prototype.dispose = function () {
    this._remove();

    this._isActive = false;
    this._snapshotIndex = 0;
    this._basic = {};
    this._extended = {};
    this._history = [];
  };

  Deloser.prototype.setActive = function (active) {
    this._isActive = active;

    if (process.env.NODE_ENV !== "production") {
      _setInformativeStyle$1(this._element, false, this._isActive, this._snapshotIndex);
    }
  };

  Deloser.prototype.getActions = function () {
    return {
      focusDefault: this.focusDefault,
      focusFirst: this.focusFirst,
      resetFocus: this.resetFocus,
      clearHistory: this.clearHistory,
      setSnapshot: this.setSnapshot,
      isActive: this.isActive
    };
  };

  Deloser.prototype.unshift = function (element) {
    var cur = this._history[this._snapshotIndex];
    cur = this._history[this._snapshotIndex] = cur.filter(function (we) {
      var e = we.get();
      return e && e !== element;
    });
    cur.unshift(new WeakHTMLElement(this._win, element, buildSelector(element)));

    while (cur.length > _containerHistoryLength) {
      cur.pop();
    }
  };

  Deloser.prototype.findAvailable = function () {
    var element = this._element.get();

    if (!element || !this._tabster.focusable.isVisible(element)) {
      return null;
    }

    var restoreFocusOrder = this._basic.restoreFocusOrder;
    var available = null;
    var ctx = RootAPI.getTabsterContext(this._tabster, element);

    if (!ctx) {
      return null;
    }

    var root = ctx.root;
    var rootElement = root.getElement();

    if (!rootElement) {
      return null;
    }

    if (restoreFocusOrder === undefined) {
      restoreFocusOrder = root.getBasicProps().restoreFocusOrder;
    }

    if (restoreFocusOrder === RestoreFocusOrders.RootDefault) {
      available = this._tabster.focusable.findDefault(rootElement);
    }

    if (!available && restoreFocusOrder === RestoreFocusOrders.RootFirst) {
      available = this._findFirst(rootElement);
    }

    if (available) {
      return available;
    }

    var availableInHistory = this._findInHistory();

    var availableDefault = this._tabster.focusable.findDefault(element);

    var availableFirst = this._findFirst(element);

    if (availableInHistory && restoreFocusOrder === RestoreFocusOrders.History) {
      return availableInHistory;
    }

    if (availableDefault && restoreFocusOrder === RestoreFocusOrders.DeloserDefault) {
      return availableDefault;
    }

    if (availableFirst && restoreFocusOrder === RestoreFocusOrders.DeloserFirst) {
      return availableFirst;
    }

    return availableDefault || availableInHistory || availableFirst || null;
  };

  Deloser.prototype.customFocusLostHandler = function (element) {
    if (this._extended.onFocusLost) {
      return this._extended.onFocusLost(element, this.getActions());
    }

    return false;
  };

  Deloser.prototype.getElement = function () {
    return this._element.get();
  };

  Deloser.prototype._findInHistory = function () {
    var cur = this._history[this._snapshotIndex].slice(0);

    this.clearHistory(true);

    for (var i = 0; i < cur.length; i++) {
      var we = cur[i];
      var e = we.get();

      var element = this._element.get();

      if (e && element && element.contains(e)) {
        if (this._tabster.focusable.isFocusable(e)) {
          return e;
        }
      } else if (!this._basic.noSelectorCheck) {
        // Element is not in the DOM, try to locate the node by it's
        // selector. This might return not exactly the right node,
        // but it would be easily fixable by having more detailed selectors.
        var selector = we.getData();

        if (selector && element) {
          var els = void 0;

          try {
            els = element.ownerDocument.querySelectorAll(selector);
          } catch (e) {
            if (process.env.NODE_ENV !== "production") {
              // This should never happen, unless there is some bug in buildElementSelector().
              console.error("Failed to querySelectorAll('" + selector + "')");
            }

            continue;
          }

          for (var i_1 = 0; i_1 < els.length; i_1++) {
            var el = els[i_1];

            if (el && this._tabster.focusable.isFocusable(el)) {
              return el;
            }
          }
        }
      }
    }

    return null;
  };

  Deloser.prototype._findFirst = function (element) {
    if (this._tabster.keyboardNavigation.isNavigatingWithKeyboard()) {
      var first = this._tabster.focusable.findFirst(element);

      if (first) {
        return first;
      }
    }

    return null;
  };

  Deloser.prototype._remove = function () {
    if (process.env.NODE_ENV !== "production") {
      _setInformativeStyle$1(this._element, true);
    }
  };

  return Deloser;
}();

var DeloserAPI =
/*#__PURE__*/

/** @class */
function () {
  function DeloserAPI(tabster, props) {
    var _this = this;

    this._isInSomeDeloser = false;
    this._isRestoringFocus = false;
    this._isPaused = false;

    this._init = function () {
      _this._initTimer = undefined;

      _this._tabster.focusedElement.subscribe(_this._onFocus);
    };

    this._onFocus = function (e) {
      if (_this._restoreFocusTimer) {
        _this._win().clearTimeout(_this._restoreFocusTimer);

        _this._restoreFocusTimer = undefined;
      }

      if (!e) {
        _this._scheduleRestoreFocus();

        return;
      }

      var deloser = _this._history.process(e);

      if (deloser) {
        _this._isInSomeDeloser = true;

        if (deloser !== _this._curDeloser) {
          if (_this._curDeloser) {
            _this._curDeloser.setActive(false);
          }

          _this._curDeloser = deloser;
        }

        deloser.setActive(true);
      } else {
        _this._isInSomeDeloser = false;
        _this._curDeloser = undefined;
      }
    };

    this._tabster = tabster;
    this._win = tabster.getWindow;
    this._history = new DeloserHistory(tabster);
    this._initTimer = this._win().setTimeout(this._init, 0);
    var autoDeloser = props === null || props === void 0 ? void 0 : props.autoDeloser;

    if (autoDeloser) {
      this._autoDeloser = autoDeloser;
    }
  }

  DeloserAPI.prototype.dispose = function () {
    var win = this._win();

    if (this._initTimer) {
      win.clearTimeout(this._initTimer);
      this._initTimer = undefined;
    }

    if (this._restoreFocusTimer) {
      win.clearTimeout(this._restoreFocusTimer);
      this._restoreFocusTimer = undefined;
    }

    if (this._autoDeloserInstance) {
      this._autoDeloserInstance.dispose();

      delete this._autoDeloserInstance;
      delete this._autoDeloser;
    }

    this._tabster.focusedElement.unsubscribe(this._onFocus);

    this._history.dispose();

    delete this._curDeloser;
  };

  DeloserAPI.dispose = function (instance) {
    instance.dispose();
  };

  DeloserAPI.prototype.getActions = function (element) {
    for (var e = element; e; e = e.parentElement) {
      var tabsterOnElement = getTabsterOnElement(this._tabster, e);

      if (tabsterOnElement && tabsterOnElement.deloser) {
        return tabsterOnElement.deloser.getActions();
      }
    }

    return undefined;
  };

  DeloserAPI.prototype.add = function (element, basic, extended) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);

    if (tabsterOnElement && tabsterOnElement.deloser) {
      return;
    }

    setTabsterOnElement(this._tabster, element, {
      deloser: new Deloser(element, this._tabster, this._win, basic, extended)
    });
  };

  DeloserAPI.prototype.remove = function (element) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);

    if (!tabsterOnElement) {
      return;
    }

    var deloser = tabsterOnElement.deloser;

    if (!deloser) {
      return;
    }

    this._history.removeDeloser(deloser);

    if (deloser.isActive()) {
      this._scheduleRestoreFocus();
    }

    deloser.dispose();
    setTabsterOnElement(this._tabster, element, {
      deloser: undefined
    });
  };

  DeloserAPI.prototype.move = function (from, to) {
    var tabsterOnElementFrom = getTabsterOnElement(this._tabster, from);

    if (tabsterOnElementFrom && tabsterOnElementFrom.deloser) {
      tabsterOnElementFrom.deloser.move(to);
      setTabsterOnElement(this._tabster, to, {
        deloser: tabsterOnElementFrom.deloser
      });
      setTabsterOnElement(this._tabster, from, {
        deloser: undefined
      });
    }
  };

  DeloserAPI.prototype.pause = function () {
    this._isPaused = true;

    if (this._restoreFocusTimer) {
      this._win().clearTimeout(this._restoreFocusTimer);

      this._restoreFocusTimer = undefined;
    }
  };

  DeloserAPI.prototype.resume = function (restore) {
    this._isPaused = false;

    if (restore) {
      this._scheduleRestoreFocus();
    }
  };

  DeloserAPI.prototype.setProps = function (element, basic, extended) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);

    if (tabsterOnElement && tabsterOnElement.deloser) {
      tabsterOnElement.deloser.setProps(basic, extended);
    }
  };

  DeloserAPI.prototype._isLastFocusedAvailable = function () {
    var last = this._tabster.focusedElement.getLastFocusedElement();

    return !!(last && last.offsetParent);
  };

  DeloserAPI.prototype._scheduleRestoreFocus = function (force) {
    var _this = this;

    if (this._isPaused || this._isRestoringFocus) {
      return;
    }

    var reallySchedule = function reallySchedule() {
      return __awaiter(_this, void 0, void 0, function () {
        var last, el;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              this._restoreFocusTimer = undefined;

              if (!force && (this._isRestoringFocus || !this._isInSomeDeloser || this._isLastFocusedAvailable())) {
                return [2
                /*return*/
                ];
              }

              if (this._curDeloser) {
                last = this._tabster.focusedElement.getLastFocusedElement();

                if (last && this._curDeloser.customFocusLostHandler(last)) {
                  return [2
                  /*return*/
                  ];
                }

                el = this._curDeloser.findAvailable();

                if (el && this._tabster.focusedElement.focus(el)) {
                  return [2
                  /*return*/
                  ];
                }
              }

              this._isInSomeDeloser = false;

              if (this._curDeloser) {
                this._curDeloser.setActive(false);

                this._curDeloser = undefined;
              }

              this._isRestoringFocus = true;
              return [4
              /*yield*/
              , this._history.focusAvailable(null)];

            case 1:
              if (!!_a.sent()) return [3
              /*break*/
              , 3];
              return [4
              /*yield*/
              , this._history.resetFocus(null)];

            case 2:
              _a.sent();

              _a.label = 3;

            case 3:
              this._isRestoringFocus = false;
              return [2
              /*return*/
              ];
          }
        });
      });
    };

    if (force) {
      reallySchedule();
    } else {
      this._restoreFocusTimer = this._win().setTimeout(reallySchedule, 100);
    }
  };

  DeloserAPI.getDeloser = function (tabster, element) {
    var _a;

    for (var e = element; e; e = e.parentElement) {
      var tabsterOnElement = getTabsterOnElement(tabster, e);

      if (tabsterOnElement && tabsterOnElement.deloser) {
        return tabsterOnElement.deloser;
      }
    }

    var tabsteri = tabster;
    var deloserAPI = tabsteri.deloser && tabsteri.deloser;

    if (deloserAPI) {
      if (deloserAPI._autoDeloserInstance) {
        return deloserAPI._autoDeloserInstance;
      }

      var autoDeloserProps = deloserAPI._autoDeloser;

      if (!deloserAPI._autoDeloserInstance && autoDeloserProps) {
        var body = (_a = element.ownerDocument) === null || _a === void 0 ? void 0 : _a.body;

        if (body) {
          deloserAPI._autoDeloserInstance = new Deloser(body, tabster, deloserAPI._win, autoDeloserProps, autoDeloserProps);
        }
      }

      return deloserAPI._autoDeloserInstance;
    }

    return undefined;
  };

  DeloserAPI.getHistory = function (instance) {
    return instance._history;
  };

  DeloserAPI.forceRestoreFocus = function (instance) {
    instance._scheduleRestoreFocus(true);
  };

  return DeloserAPI;
}();

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var _transactionTimeout = 1500;
var _pingTimeout = 3000;
var _targetIdUp = 'up';
var CrossOriginTransactionTypes = {
  Bootstrap: 1,
  FocusElement: 2,
  State: 3,
  GetElement: 4,
  RestoreFocusInDeloser: 5,
  Ping: 6
};

var CrossOriginDeloserItem =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(CrossOriginDeloserItem, _super);

  function CrossOriginDeloserItem(tabster, deloser, trasactions) {
    var _this = _super.call(this) || this;

    _this._deloser = deloser;
    _this._transactions = trasactions;
    return _this;
  }

  CrossOriginDeloserItem.prototype.belongsTo = function (deloser) {
    return deloser.deloserUId === this._deloser.deloserUId;
  };

  CrossOriginDeloserItem.prototype.focusAvailable = function () {
    return __awaiter(this, void 0, void 0, function () {
      var data;
      return __generator(this, function (_a) {
        data = __assign(__assign({}, this._deloser), {
          reset: false
        });
        return [2
        /*return*/
        , this._transactions.beginTransaction(RestoreFocusInDeloserTransaction, data).then(function (value) {
          return !!value;
        })];
      });
    });
  };

  CrossOriginDeloserItem.prototype.resetFocus = function () {
    return __awaiter(this, void 0, void 0, function () {
      var data;
      return __generator(this, function (_a) {
        data = __assign(__assign({}, this._deloser), {
          reset: true
        });
        return [2
        /*return*/
        , this._transactions.beginTransaction(RestoreFocusInDeloserTransaction, data).then(function (value) {
          return !!value;
        })];
      });
    });
  };

  return CrossOriginDeloserItem;
}(DeloserItemBase);

var CrossOriginDeloserHistoryByRoot =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(CrossOriginDeloserHistoryByRoot, _super);

  function CrossOriginDeloserHistoryByRoot(tabster, rootUId, transactions) {
    var _this = _super.call(this, tabster, rootUId) || this;

    _this._transactions = transactions;
    return _this;
  }

  CrossOriginDeloserHistoryByRoot.prototype.unshift = function (deloser) {
    var item;

    for (var i = 0; i < this._history.length; i++) {
      if (this._history[i].belongsTo(deloser)) {
        item = this._history[i];

        this._history.splice(i, 1);

        break;
      }
    }

    if (!item) {
      item = new CrossOriginDeloserItem(this._tabster, deloser, this._transactions);
    }

    this._history.unshift(item);

    this._history.splice(10, this._history.length - 10);
  };

  CrossOriginDeloserHistoryByRoot.prototype.focusAvailable = function () {
    return __awaiter(this, void 0, void 0, function () {
      var _i, _a, i;

      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            _i = 0, _a = this._history;
            _b.label = 1;

          case 1:
            if (!(_i < _a.length)) return [3
            /*break*/
            , 4];
            i = _a[_i];
            return [4
            /*yield*/
            , i.focusAvailable()];

          case 2:
            if (_b.sent()) {
              return [2
              /*return*/
              , true];
            }

            _b.label = 3;

          case 3:
            _i++;
            return [3
            /*break*/
            , 1];

          case 4:
            return [2
            /*return*/
            , false];
        }
      });
    });
  };

  CrossOriginDeloserHistoryByRoot.prototype.resetFocus = function () {
    return __awaiter(this, void 0, void 0, function () {
      var _i, _a, i;

      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            _i = 0, _a = this._history;
            _b.label = 1;

          case 1:
            if (!(_i < _a.length)) return [3
            /*break*/
            , 4];
            i = _a[_i];
            return [4
            /*yield*/
            , i.resetFocus()];

          case 2:
            if (_b.sent()) {
              return [2
              /*return*/
              , true];
            }

            _b.label = 3;

          case 3:
            _i++;
            return [3
            /*break*/
            , 1];

          case 4:
            return [2
            /*return*/
            , false];
        }
      });
    });
  };

  return CrossOriginDeloserHistoryByRoot;
}(DeloserHistoryByRootBase);

var CrossOriginTransaction =
/*#__PURE__*/

/** @class */
function () {
  function CrossOriginTransaction(tabster, getOwner, knownTargets, value, timeout, sentTo, targetId, sendUp) {
    var _a;

    var _this = this;

    this._inProgress = {};
    this._isDone = false;
    this._isSelfResponding = false;
    this._sentCount = 0;
    this.tabster = tabster;
    this.owner = getOwner;
    this.ownerId = getWindowUId(getOwner());
    this.id = getUId(getOwner());
    this.beginData = value;
    this._knownTargets = knownTargets;
    this._sentTo = sentTo || (_a = {}, _a[this.ownerId] = true, _a);
    this.targetId = targetId;
    this.sendUp = sendUp;
    this.timeout = timeout;
    this._promise = new (getPromise(getOwner))(function (resolve, reject) {
      _this._resolve = resolve;
      _this._reject = reject;
    });
  }

  CrossOriginTransaction.prototype.getTargets = function (knownTargets) {
    var _a, _b, _c;

    return this.targetId === _targetIdUp ? this.sendUp ? (_a = {}, _a[_targetIdUp] = {
      send: this.sendUp
    }, _a) : null : this.targetId ? knownTargets[this.targetId] ? (_b = {}, _b[this.targetId] = {
      send: knownTargets[this.targetId].send
    }, _b) : null : Object.keys(knownTargets).length === 0 && this.sendUp ? (_c = {}, _c[_targetIdUp] = {
      send: this.sendUp
    }, _c) : Object.keys(knownTargets).length > 0 ? knownTargets : null;
  };

  CrossOriginTransaction.prototype.begin = function (selfResponse) {
    var _this = this;

    var targets = this.getTargets(this._knownTargets);

    var sentTo = __assign({}, this._sentTo);

    if (targets) {
      for (var _i = 0, _a = Object.keys(targets); _i < _a.length; _i++) {
        var id = _a[_i];
        sentTo[id] = true;
      }
    }

    var data = {
      transaction: this.id,
      type: this.type,
      isResponse: false,
      timestamp: Date.now(),
      owner: this.ownerId,
      sentto: sentTo,
      timeout: this.timeout,
      beginData: this.beginData
    };

    if (this.targetId) {
      data.target = this.targetId;
    }

    if (selfResponse) {
      this._isSelfResponding = true;
      selfResponse(data).then(function (value) {
        _this._isSelfResponding = false;

        if (value !== undefined) {
          if (!_this.endData) {
            _this.endData = value;
          }
        }

        if (_this.endData || _this._sentCount === 0) {
          _this.end();
        }
      });
    }

    if (targets) {
      for (var _b = 0, _c = Object.keys(targets); _b < _c.length; _b++) {
        var id = _c[_b];

        if (!(id in this._sentTo)) {
          this._send(targets[id].send, id, data);
        }
      }
    }

    if (this._sentCount === 0 && !this._isSelfResponding) {
      this.end();
    }

    return this._promise;
  };

  CrossOriginTransaction.prototype._send = function (send, targetId, data) {
    if (this._inProgress[targetId] === undefined) {
      this._inProgress[targetId] = true;
      this._sentCount++;
      send(data);
    }
  };

  CrossOriginTransaction.prototype.end = function (error) {
    if (this._isDone) {
      return;
    }

    this._isDone = true;

    if (this.endData === undefined && error) {
      if (this._reject) {
        this._reject(error);
      }
    } else if (this._resolve) {
      this._resolve(this.endData);
    }
  };

  CrossOriginTransaction.prototype.onResponse = function (data) {
    var endData = data.endData;

    if (endData !== undefined && !this.endData) {
      this.endData = endData;
    }

    var inProgressId = data.target === _targetIdUp ? _targetIdUp : data.owner;

    if (this._inProgress[inProgressId]) {
      this._inProgress[inProgressId] = false;
      this._sentCount--;

      if (this.endData || this._sentCount === 0 && !this._isSelfResponding) {
        this.end();
      }
    }
  };

  return CrossOriginTransaction;
}();

var BootstrapTransaction =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(BootstrapTransaction, _super);

  function BootstrapTransaction() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.type = CrossOriginTransactionTypes.Bootstrap;
    return _this;
  }

  BootstrapTransaction.shouldForward = function () {
    return false;
  };

  BootstrapTransaction.makeResponse = function (tabster) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        return [2
        /*return*/
        , {
          isNavigatingWithKeyboard: tabster.keyboardNavigation.isNavigatingWithKeyboard()
        }];
      });
    });
  };

  return BootstrapTransaction;
}(CrossOriginTransaction);

var FocusElementTransaction =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(FocusElementTransaction, _super);

  function FocusElementTransaction() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.type = CrossOriginTransactionTypes.FocusElement;
    return _this;
  }

  FocusElementTransaction.shouldForward = function (tabster, data, getOwner) {
    var el = GetElementTransaction.findElement(tabster, getOwner, data.beginData);
    return !el || !tabster.focusable.isFocusable(el);
  };

  FocusElementTransaction.makeResponse = function (tabster, data, getOwner, ownerId, transactions, forwardResult) {
    return __awaiter(this, void 0, void 0, function () {
      var el, _a;

      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            el = GetElementTransaction.findElement(tabster, getOwner, data.beginData);
            _a = !!el && tabster.focusedElement.focus(el);
            if (_a) return [3
            /*break*/
            , 2];
            return [4
            /*yield*/
            , forwardResult];

          case 1:
            _a = !!_b.sent();
            _b.label = 2;

          case 2:
            return [2
            /*return*/
            , _a];
        }
      });
    });
  };

  FocusElementTransaction.shouldSelfRespond = function () {
    return true;
  };

  return FocusElementTransaction;
}(CrossOriginTransaction);

var CrossOriginStates = {
  Focused: 1,
  Blurred: 2,
  Observed: 3,
  DeadWindow: 4,
  KeyboardNavigation: 5,
  Outline: 6
};

var StateTransaction =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(StateTransaction, _super);

  function StateTransaction() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.type = CrossOriginTransactionTypes.State;
    return _this;
  }

  StateTransaction.shouldSelfRespond = function (tabster, data) {
    return data.state !== CrossOriginStates.DeadWindow && data.state !== CrossOriginStates.KeyboardNavigation;
  };

  StateTransaction.makeResponse = function (tabster, data, getOwner, ownerId, transactions, forwardResult, isSelfResponse) {
    return __awaiter(this, void 0, void 0, function () {
      var timestamp, beginData;
      return __generator(this, function (_a) {
        timestamp = data.timestamp;
        beginData = data.beginData;

        if (timestamp && beginData) {
          switch (beginData.state) {
            case CrossOriginStates.Focused:
              return [2
              /*return*/
              , StateTransaction._makeFocusedResponse(tabster, timestamp, beginData, transactions, isSelfResponse)];

            case CrossOriginStates.Blurred:
              return [2
              /*return*/
              , StateTransaction._makeBlurredResponse(tabster, timestamp, beginData, transactions.ctx)];

            case CrossOriginStates.Observed:
              return [2
              /*return*/
              , StateTransaction._makeObservedResponse(tabster, beginData)];

            case CrossOriginStates.DeadWindow:
              return [2
              /*return*/
              , StateTransaction._makeDeadWindowResponse(tabster, beginData, transactions, forwardResult)];

            case CrossOriginStates.KeyboardNavigation:
              return [2
              /*return*/
              , StateTransaction._makeKeyboardNavigationResponse(tabster, transactions.ctx, beginData.isNavigatingWithKeyboard)];

            case CrossOriginStates.Outline:
              return [2
              /*return*/
              , StateTransaction._makeOutlineResponse(tabster, transactions.ctx, beginData.outline)];
          }
        }

        return [2
        /*return*/
        , true];
      });
    });
  };

  StateTransaction.createElement = function (tabster, beginData) {
    return beginData.uid ? new CrossOriginElement(tabster, beginData.uid, beginData.ownerUId, beginData.id, beginData.rootUId, beginData.observedName, beginData.observedDetails) : null;
  };

  StateTransaction._makeFocusedResponse = function (tabster, timestamp, beginData, transactions, isSelfResponse) {
    return __awaiter(this, void 0, void 0, function () {
      var element, deloserAPI, history_1, deloser_1, historyItem;
      return __generator(this, function (_a) {
        element = StateTransaction.createElement(tabster, beginData);

        if (beginData && beginData.ownerUId && element) {
          transactions.ctx.focusOwner = beginData.ownerUId;
          transactions.ctx.focusOwnerTimestamp = timestamp;

          if (!isSelfResponse && beginData.rootUId && beginData.deloserUId) {
            deloserAPI = tabster.deloser;

            if (deloserAPI) {
              history_1 = DeloserAPI.getHistory(deloserAPI);
              deloser_1 = {
                ownerUId: beginData.ownerUId,
                deloserUId: beginData.deloserUId,
                rootUId: beginData.rootUId
              };
              historyItem = history_1.make(beginData.rootUId, function () {
                return new CrossOriginDeloserHistoryByRoot(tabster, deloser_1.rootUId, transactions);
              });
              historyItem.unshift(deloser_1);
            }
          }

          CrossOriginFocusedElementState.setVal(tabster.crossOrigin.focusedElement, element, {
            isFocusedProgrammatically: beginData.isFocusedProgrammatically
          });
        }

        return [2
        /*return*/
        , true];
      });
    });
  };

  StateTransaction._makeBlurredResponse = function (tabster, timestamp, beginData, context) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        if (beginData && (beginData.ownerUId === context.focusOwner || beginData.force) && (!context.focusOwnerTimestamp || context.focusOwnerTimestamp < timestamp)) {
          CrossOriginFocusedElementState.setVal(tabster.crossOrigin.focusedElement, undefined, {});
        }

        return [2
        /*return*/
        , true];
      });
    });
  };

  StateTransaction._makeObservedResponse = function (tabster, beginData) {
    return __awaiter(this, void 0, void 0, function () {
      var name, element;
      return __generator(this, function (_a) {
        name = beginData.observedName;
        element = StateTransaction.createElement(tabster, beginData);

        if (name && element) {
          CrossOriginObservedElementState.trigger(tabster.crossOrigin.observedElement, element, {
            name: name,
            details: beginData.observedDetails
          });
        }

        return [2
        /*return*/
        , true];
      });
    });
  };

  StateTransaction._makeDeadWindowResponse = function (tabster, beginData, transactions, forwardResult) {
    return __awaiter(this, void 0, void 0, function () {
      var deadUId;
      return __generator(this, function (_a) {
        deadUId = beginData && beginData.ownerUId;

        if (deadUId) {
          transactions.removeTarget(deadUId);
        }

        return [2
        /*return*/
        , forwardResult.then(function () {
          if (deadUId === transactions.ctx.focusOwner) {
            var deloserAPI = tabster.deloser;

            if (deloserAPI) {
              DeloserAPI.forceRestoreFocus(deloserAPI);
            }
          }

          return true;
        })];
      });
    });
  };

  StateTransaction._makeKeyboardNavigationResponse = function (tabster, context, isNavigatingWithKeyboard) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        if (isNavigatingWithKeyboard !== undefined && tabster.keyboardNavigation.isNavigatingWithKeyboard() !== isNavigatingWithKeyboard) {
          context.ignoreKeyboardNavigationStateUpdate = true;
          KeyboardNavigationState.setVal(tabster.keyboardNavigation, isNavigatingWithKeyboard);
          context.ignoreKeyboardNavigationStateUpdate = false;
        }

        return [2
        /*return*/
        , true];
      });
    });
  };

  StateTransaction._makeOutlineResponse = function (tabster, context, props) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        if (context.origOutlineSetup) {
          context.origOutlineSetup.call(tabster.outline, props);
        }

        return [2
        /*return*/
        , true];
      });
    });
  };

  return StateTransaction;
}(CrossOriginTransaction);

var GetElementTransaction =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(GetElementTransaction, _super);

  function GetElementTransaction() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.type = CrossOriginTransactionTypes.GetElement;
    return _this;
  }

  GetElementTransaction.findElement = function (tabster, getOwner, data) {
    var element;

    if (data && (!data.ownerId || data.ownerId === getWindowUId(getOwner()))) {
      if (data.id) {
        element = getOwner().document.getElementById(data.id);

        if (element && data.rootId) {
          var ctx = RootAPI.getTabsterContext(tabster, element);

          if (!ctx || ctx.root.uid !== data.rootId) {
            return null;
          }
        }
      } else if (data.uid) {
        var ref = getInstanceContext(getOwner).elementByUId[data.uid];
        element = ref && ref.get();
      } else if (data.observedName) {
        element = tabster.observedElement.getElement(data.observedName);
      }
    }

    return element || null;
  };

  GetElementTransaction.getElementData = function (tabster, element, getOwner, context, ownerUId) {
    var deloser = DeloserAPI.getDeloser(tabster, element);
    var ctx = RootAPI.getTabsterContext(tabster, element);
    var tabsterOnElement = getTabsterOnElement(tabster, element);
    var observed = tabsterOnElement && tabsterOnElement.observed;
    return {
      uid: getElementUId(getOwner, element),
      ownerUId: ownerUId,
      id: element.id || undefined,
      rootUId: ctx ? ctx.root.uid : undefined,
      deloserUId: deloser ? getDeloserUID(getOwner, context, deloser) : undefined,
      observedName: observed && observed.name,
      observedDetails: observed && observed.details
    };
  };

  GetElementTransaction.makeResponse = function (tabster, data, getOwner, ownerUId, transactions, forwardResult) {
    return __awaiter(this, void 0, void 0, function () {
      var beginData, element, dataOut, name_1, timeout_1, e;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            beginData = data.beginData;

            if (beginData === undefined) {
              element = tabster.focusedElement.getFocusedElement();
            } else if (beginData) {
              element = GetElementTransaction.findElement(tabster, getOwner, beginData) || undefined;
            }

            if (!(!element && beginData)) return [3
            /*break*/
            , 2];
            name_1 = beginData.observedName;
            timeout_1 = data.timeout;
            if (!(name_1 && timeout_1)) return [3
            /*break*/
            , 2];
            return [4
            /*yield*/
            , new (getPromise(getOwner))(function (resolve, reject) {
              var isWaitElementResolved = false;
              var isForwardResolved = false;
              var isResolved = false;
              tabster.observedElement.waitElement(name_1, timeout_1).then(function (value) {
                isWaitElementResolved = true;

                if (!isResolved && (value || isForwardResolved)) {
                  isResolved = true;
                  resolve({
                    element: value
                  });
                }
              });
              forwardResult.then(function (value) {
                isForwardResolved = true;

                if (!isResolved && (value || isWaitElementResolved)) {
                  isResolved = true;
                  resolve({
                    crossOrigin: value
                  });
                }
              });
            })];

          case 1:
            e = _a.sent();

            if (e.element) {
              element = e.element;
            } else if (e.crossOrigin) {
              dataOut = e.crossOrigin;
            }

            _a.label = 2;

          case 2:
            return [2
            /*return*/
            , element ? GetElementTransaction.getElementData(tabster, element, getOwner, transactions.ctx, ownerUId) : dataOut];
        }
      });
    });
  };

  GetElementTransaction.shouldSelfRespond = function () {
    return true;
  };

  return GetElementTransaction;
}(CrossOriginTransaction);

var RestoreFocusInDeloserTransaction =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(RestoreFocusInDeloserTransaction, _super);

  function RestoreFocusInDeloserTransaction() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.type = CrossOriginTransactionTypes.RestoreFocusInDeloser;
    return _this;
  }

  RestoreFocusInDeloserTransaction.makeResponse = function (tabster, data, getOwner, ownerId, transactions, forwardResult) {
    return __awaiter(this, void 0, void 0, function () {
      var forwardRet, begin, uid, deloser, deloserAPI, history_2;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            return [4
            /*yield*/
            , forwardResult];

          case 1:
            forwardRet = _a.sent();
            begin = !forwardRet && data.beginData;
            uid = begin && begin.deloserUId;
            deloser = uid && transactions.ctx.deloserByUId[uid];
            deloserAPI = tabster.deloser;

            if (begin && deloser && deloserAPI) {
              history_2 = DeloserAPI.getHistory(deloserAPI);
              return [2
              /*return*/
              , begin.reset ? history_2.resetFocus(deloser) : history_2.focusAvailable(deloser)];
            }

            return [2
            /*return*/
            , !!forwardRet];
        }
      });
    });
  };

  return RestoreFocusInDeloserTransaction;
}(CrossOriginTransaction);

var PingTransaction =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(PingTransaction, _super);

  function PingTransaction() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.type = CrossOriginTransactionTypes.Ping;
    return _this;
  }

  PingTransaction.shouldForward = function () {
    return false;
  };

  PingTransaction.makeResponse = function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        return [2
        /*return*/
        , true];
      });
    });
  };

  return PingTransaction;
}(CrossOriginTransaction);

var CrossOriginTransactions =
/*#__PURE__*/

/** @class */
function () {
  function CrossOriginTransactions(tabster, getOwner, context) {
    var _this = this;

    this._knownTargets = {};
    this._transactions = {};
    this._isDefaultSendUp = false;
    this.isSetUp = false;

    this._onMessage = function (e) {
      if (e.data.owner === _this._ownerUId || !_this._tabster) {
        return;
      }

      var data = e.data;
      var transactionId;

      if (!data || !(transactionId = data.transaction) || !data.type || !data.timestamp || !data.owner || !data.sentto) {
        return;
      }

      var knownTarget = _this._knownTargets[data.owner];

      if (!knownTarget && e.send && data.owner !== _this._ownerUId) {
        knownTarget = _this._knownTargets[data.owner] = {
          send: e.send
        };
      }

      if (knownTarget) {
        knownTarget.last = Date.now();
      }

      if (data.isResponse) {
        var t = _this._transactions[transactionId];

        if (t && t.transaction && t.transaction.type === data.type) {
          t.transaction.onResponse(data);
        }
      } else {
        var Transaction = _this._getTransactionClass(data.type);

        var forwardResult = _this.forwardTransaction(data);

        if (Transaction && e.send) {
          Transaction.makeResponse(_this._tabster, data, _this._owner, _this._ownerUId, _this, forwardResult, false).then(function (r) {
            var response = {
              transaction: data.transaction,
              type: data.type,
              isResponse: true,
              timestamp: Date.now(),
              owner: _this._ownerUId,
              timeout: data.timeout,
              sentto: {},
              target: data.target === _targetIdUp ? _targetIdUp : data.owner,
              endData: r
            };
            e.send(response);
          });
        }
      }
    };

    this._onPageHide = function () {
      _this._dead();
    };

    this._onBrowserMessage = function (e) {
      if (e.source === _this._owner()) {
        return;
      }

      var send = function send(data) {
        if (e.source && e.source.postMessage) {
          e.source.postMessage(JSON.stringify(data), '*');
        }
      };

      try {
        _this._onMessage({
          data: JSON.parse(e.data),
          send: send
        });
      } catch (e) {
        /* Ignore */
      }
    };

    this._tabster = tabster;
    this._owner = getOwner;
    this._ownerUId = getWindowUId(getOwner());
    this.ctx = context;
  }

  CrossOriginTransactions.prototype.setup = function (sendUp) {
    if (this.isSetUp) {
      if (process.env.NODE_ENV !== "production") {
        console.error('CrossOrigin is already set up.');
      }
    } else {
      this.isSetUp = true;
      this.setSendUp(sendUp);

      this._owner().addEventListener('pagehide', this._onPageHide);

      this._ping();
    }

    return this._onMessage;
  };

  CrossOriginTransactions.prototype.setSendUp = function (sendUp) {
    if (!this.isSetUp) {
      throw new Error('CrossOrigin is not set up.');
    }

    this.sendUp = sendUp || undefined;

    var owner = this._owner();

    if (sendUp === undefined) {
      if (!this._isDefaultSendUp) {
        if (owner.document) {
          this._isDefaultSendUp = true;

          if (owner.parent && owner.parent !== owner && owner.parent.postMessage) {
            this.sendUp = function (data) {
              owner.parent.postMessage(JSON.stringify(data), '*');
            };
          }

          owner.addEventListener('message', this._onBrowserMessage);
        }
      }
    } else if (this._isDefaultSendUp) {
      owner.removeEventListener('message', this._onBrowserMessage);
      this._isDefaultSendUp = false;
    }

    return this._onMessage;
  };

  CrossOriginTransactions.prototype.dispose = function () {
    return __awaiter(this, void 0, void 0, function () {
      var owner, _i, _a, id, t;

      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            owner = this._owner();

            if (this._pingTimer) {
              owner.clearTimeout(this._pingTimer);
              this._pingTimer = undefined;
            }

            owner.removeEventListener('message', this._onBrowserMessage);
            owner.removeEventListener('pagehide', this._onPageHide);
            return [4
            /*yield*/
            , this._dead()];

          case 1:
            _b.sent();

            delete this._deadPromise;

            for (_i = 0, _a = Object.keys(this._transactions); _i < _a.length; _i++) {
              id = _a[_i];
              t = this._transactions[id];

              if (t.timer) {
                owner.clearTimeout(t.timer);
                delete t.timer;
              }

              t.transaction.end();
            }

            this._knownTargets = {};
            delete this.sendUp;
            return [2
            /*return*/
            ];
        }
      });
    });
  };

  CrossOriginTransactions.prototype.beginTransaction = function (Transaction, value, timeout, sentTo, targetId, withReject) {
    var _this = this;

    if (!this._owner) {
      return getPromise(this._owner).reject();
    }

    var transaction = new Transaction(this._tabster, this._owner, this._knownTargets, value, timeout, sentTo, targetId, this.sendUp);
    var selfResponse;

    if (Transaction.shouldSelfRespond && Transaction.shouldSelfRespond(this._tabster, value, this._owner, this._ownerUId)) {
      selfResponse = function selfResponse(data) {
        return Transaction.makeResponse(_this._tabster, data, _this._owner, _this._ownerUId, _this, getPromise(_this._owner).resolve(undefined), true);
      };
    }

    return this._beginTransaction(transaction, timeout, selfResponse, withReject);
  };

  CrossOriginTransactions.prototype.removeTarget = function (uid) {
    delete this._knownTargets[uid];
  };

  CrossOriginTransactions.prototype._beginTransaction = function (transaction, timeout, selfResponse, withReject) {
    var _this = this;

    var owner = this._owner();

    var wrapper = {
      transaction: transaction,
      timer: owner.setTimeout(function () {
        delete wrapper.timer;
        transaction.end('Cross origin transaction timed out.');
      }, _transactionTimeout + (timeout || 0))
    };
    this._transactions[transaction.id] = wrapper;
    var ret = transaction.begin(selfResponse);
    ret["catch"](function () {})["finally"](function () {
      if (wrapper.timer) {
        owner.clearTimeout(wrapper.timer);
      }

      delete _this._transactions[transaction.id];
    });
    return ret.then(function (value) {
      return value;
    }, withReject ? undefined : function () {
      return undefined;
    });
  };

  CrossOriginTransactions.prototype.forwardTransaction = function (data) {
    var owner = this._owner;
    var targetId = data.target;

    if (targetId === this._ownerUId) {
      return getPromise(owner).resolve();
    }

    var Transaction = this._getTransactionClass(data.type);

    if (Transaction) {
      if (Transaction.shouldForward === undefined || Transaction.shouldForward(this._tabster, data, owner, this._ownerUId)) {
        var sentTo = data.sentto;

        if (targetId === _targetIdUp) {
          targetId = undefined;
          sentTo[this._ownerUId] = true;
        }

        delete sentTo[_targetIdUp];
        return this._beginTransaction(new Transaction(this._tabster, owner, this._knownTargets, data.beginData, data.timeout, sentTo, targetId, this.sendUp), data.timeout);
      } else {
        return getPromise(owner).resolve();
      }
    }

    return getPromise(owner).reject("Unknown transaction type " + data.type);
  };

  CrossOriginTransactions.prototype._getTransactionClass = function (type) {
    switch (type) {
      case CrossOriginTransactionTypes.Bootstrap:
        return BootstrapTransaction;

      case CrossOriginTransactionTypes.FocusElement:
        return FocusElementTransaction;

      case CrossOriginTransactionTypes.State:
        return StateTransaction;

      case CrossOriginTransactionTypes.GetElement:
        return GetElementTransaction;

      case CrossOriginTransactionTypes.RestoreFocusInDeloser:
        return RestoreFocusInDeloserTransaction;

      case CrossOriginTransactionTypes.Ping:
        return PingTransaction;

      default:
        return null;
    }
  };

  CrossOriginTransactions.prototype._dead = function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            if (!this._deadPromise && this.ctx.focusOwner === this._ownerUId) {
              this._deadPromise = this.beginTransaction(StateTransaction, {
                ownerUId: this._ownerUId,
                state: CrossOriginStates.DeadWindow
              });
            }

            if (!this._deadPromise) return [3
            /*break*/
            , 2];
            return [4
            /*yield*/
            , this._deadPromise];

          case 1:
            _a.sent();

            _a.label = 2;

          case 2:
            return [2
            /*return*/
            ];
        }
      });
    });
  };

  CrossOriginTransactions.prototype._ping = function () {
    return __awaiter(this, void 0, void 0, function () {
      var deadWindows, now, targets, focused, deloserAPI;

      var _this = this;

      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            if (this._pingTimer) {
              return [2
              /*return*/
              ];
            }

            now = Date.now();
            targets = Object.keys(this._knownTargets).filter(function (uid) {
              return now - (_this._knownTargets[uid].last || 0) > _pingTimeout;
            });

            if (this.sendUp) {
              targets.push(_targetIdUp);
            }

            if (!targets.length) return [3
            /*break*/
            , 2];
            return [4
            /*yield*/
            , getPromise(this._owner).all(targets.map(function (uid) {
              return _this.beginTransaction(PingTransaction, undefined, undefined, undefined, uid, true).then(function () {
                return true;
              }, function () {
                if (uid !== _targetIdUp) {
                  if (!deadWindows) {
                    deadWindows = {};
                  }

                  deadWindows[uid] = true;
                  delete _this._knownTargets[uid];
                }

                return false;
              });
            }))];

          case 1:
            _a.sent();

            _a.label = 2;

          case 2:
            if (!deadWindows) return [3
            /*break*/
            , 5];
            return [4
            /*yield*/
            , this.beginTransaction(GetElementTransaction, undefined)];

          case 3:
            focused = _a.sent();
            if (!(!focused && this.ctx.focusOwner && this.ctx.focusOwner in deadWindows)) return [3
            /*break*/
            , 5];
            return [4
            /*yield*/
            , this.beginTransaction(StateTransaction, {
              ownerUId: this._ownerUId,
              state: CrossOriginStates.Blurred,
              force: true
            })];

          case 4:
            _a.sent();

            deloserAPI = this._tabster.deloser;

            if (deloserAPI) {
              DeloserAPI.forceRestoreFocus(deloserAPI);
            }

            _a.label = 5;

          case 5:
            this._pingTimer = this._owner().setTimeout(function () {
              _this._pingTimer = undefined;

              _this._ping();
            }, _pingTimeout);
            return [2
            /*return*/
            ];
        }
      });
    });
  };

  return CrossOriginTransactions;
}();

var CrossOriginElement =
/*#__PURE__*/

/** @class */
function () {
  function CrossOriginElement(tabster, uid, ownerId, id, rootId, observedName, observedDetails) {
    this._tabster = tabster;
    this.uid = uid;
    this.ownerId = ownerId;
    this.id = id;
    this.rootId = rootId;
    this.observedName = observedName;
    this.observedDetails = observedDetails;
  }

  CrossOriginElement.prototype.focus = function (noFocusedProgrammaticallyFlag, noAccessibleCheck) {
    return this._tabster.crossOrigin.focusedElement.focus(this, noFocusedProgrammaticallyFlag, noAccessibleCheck);
  };

  return CrossOriginElement;
}();

var CrossOriginFocusedElementState =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(CrossOriginFocusedElementState, _super);

  function CrossOriginFocusedElementState(transactions) {
    var _this = _super.call(this) || this;

    _this._transactions = transactions;
    return _this;
  }

  CrossOriginFocusedElementState.prototype.dispose = function () {
    _super.prototype.dispose.call(this);
  };

  CrossOriginFocusedElementState.dispose = function (instance) {
    instance.dispose();
  };

  CrossOriginFocusedElementState.prototype.focus = function (element, noFocusedProgrammaticallyFlag, noAccessibleCheck) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        return [2
        /*return*/
        , this._focus({
          uid: element.uid,
          id: element.id,
          rootId: element.rootId,
          ownerId: element.ownerId,
          observedName: element.observedName
        }, noFocusedProgrammaticallyFlag, noAccessibleCheck)];
      });
    });
  };

  CrossOriginFocusedElementState.prototype.focusById = function (elementId, rootId, noFocusedProgrammaticallyFlag, noAccessibleCheck) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        return [2
        /*return*/
        , this._focus({
          id: elementId,
          rootId: rootId
        }, noFocusedProgrammaticallyFlag, noAccessibleCheck)];
      });
    });
  };

  CrossOriginFocusedElementState.prototype.focusByObservedName = function (observedName, timeout, rootId, noFocusedProgrammaticallyFlag, noAccessibleCheck) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        return [2
        /*return*/
        , this._focus({
          observedName: observedName,
          rootId: rootId
        }, noFocusedProgrammaticallyFlag, noAccessibleCheck, timeout)];
      });
    });
  };

  CrossOriginFocusedElementState.prototype._focus = function (elementData, noFocusedProgrammaticallyFlag, noAccessibleCheck, timeout) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        return [2
        /*return*/
        , this._transactions.beginTransaction(FocusElementTransaction, __assign(__assign({}, elementData), {
          noFocusedProgrammaticallyFlag: noFocusedProgrammaticallyFlag,
          noAccessibleCheck: noAccessibleCheck
        }), timeout).then(function (value) {
          return !!value;
        })];
      });
    });
  };

  CrossOriginFocusedElementState.setVal = function (instance, val, details) {
    instance.setVal(val, details);
  };

  return CrossOriginFocusedElementState;
}(Subscribable);

var CrossOriginObservedElementState =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(CrossOriginObservedElementState, _super);

  function CrossOriginObservedElementState(tabster, transactions) {
    var _this = _super.call(this) || this;

    _this._lastRequestFocusId = 0;
    _this._tabster = tabster;
    _this._transactions = transactions;
    return _this;
  }

  CrossOriginObservedElementState.prototype.dispose = function () {
    _super.prototype.dispose.call(this);
  };

  CrossOriginObservedElementState.dispose = function (instance) {
    instance.dispose();
  };

  CrossOriginObservedElementState.prototype.getElement = function (observedName) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        return [2
        /*return*/
        , this.waitElement(observedName, 0)];
      });
    });
  };

  CrossOriginObservedElementState.prototype.waitElement = function (observedName, timeout) {
    return __awaiter(this, void 0, void 0, function () {
      var _this = this;

      return __generator(this, function (_a) {
        return [2
        /*return*/
        , this._transactions.beginTransaction(GetElementTransaction, {
          observedName: observedName
        }, timeout).then(function (value) {
          return value ? StateTransaction.createElement(_this._tabster, value) : null;
        })];
      });
    });
  };

  CrossOriginObservedElementState.prototype.requestFocus = function (observedName, timeout) {
    return __awaiter(this, void 0, void 0, function () {
      var requestId;

      var _this = this;

      return __generator(this, function (_a) {
        requestId = ++this._lastRequestFocusId;
        return [2
        /*return*/
        , this.waitElement(observedName, timeout).then(function (element) {
          return _this._lastRequestFocusId === requestId && element ? _this._tabster.crossOrigin.focusedElement.focus(element) : false;
        })];
      });
    });
  };

  CrossOriginObservedElementState.trigger = function (instance, element, details) {
    instance.trigger(element, details);
  };

  return CrossOriginObservedElementState;
}(Subscribable);

var CrossOriginAPI =
/*#__PURE__*/

/** @class */
function () {
  function CrossOriginAPI(tabster) {
    var _this = this;

    this._init = function () {
      _this._initTimer = undefined;
      var tabster = _this._tabster;
      tabster.keyboardNavigation.subscribe(_this._onKeyboardNavigationStateChanged);
      tabster.focusedElement.subscribe(_this._onFocus);
      tabster.observedElement.subscribe(_this._onObserved);

      if (!_this._ctx.origOutlineSetup) {
        _this._ctx.origOutlineSetup = tabster.outline.setup;
        tabster.outline.setup = _this._outlineSetup;
      }

      _this._transactions.beginTransaction(BootstrapTransaction, undefined, undefined, undefined, _targetIdUp).then(function (data) {
        if (data && _this._tabster.keyboardNavigation.isNavigatingWithKeyboard() !== data.isNavigatingWithKeyboard) {
          _this._ctx.ignoreKeyboardNavigationStateUpdate = true;
          KeyboardNavigationState.setVal(_this._tabster.keyboardNavigation, data.isNavigatingWithKeyboard);
          _this._ctx.ignoreKeyboardNavigationStateUpdate = false;
        }
      });
    };

    this._onKeyboardNavigationStateChanged = function (value) {
      if (!_this._ctx.ignoreKeyboardNavigationStateUpdate) {
        _this._transactions.beginTransaction(StateTransaction, {
          state: CrossOriginStates.KeyboardNavigation,
          ownerUId: getWindowUId(_this._win()),
          isNavigatingWithKeyboard: value
        });
      }
    };

    this._onFocus = function (element, details) {
      var win = _this._win();

      var ownerUId = getWindowUId(win);

      if (_this._blurTimer) {
        win.clearTimeout(_this._blurTimer);
        _this._blurTimer = undefined;
      }

      if (element) {
        _this._transactions.beginTransaction(StateTransaction, __assign(__assign({}, GetElementTransaction.getElementData(_this._tabster, element, _this._win, _this._ctx, ownerUId)), {
          state: CrossOriginStates.Focused
        }));
      } else {
        _this._blurTimer = win.setTimeout(function () {
          _this._blurTimer = undefined;

          if (_this._ctx.focusOwner && _this._ctx.focusOwner === ownerUId) {
            _this._transactions.beginTransaction(GetElementTransaction, undefined).then(function (value) {
              if (!value && _this._ctx.focusOwner === ownerUId) {
                _this._transactions.beginTransaction(StateTransaction, {
                  ownerUId: ownerUId,
                  state: CrossOriginStates.Blurred,
                  force: false
                });
              }
            });
          }
        }, 0);
      }
    };

    this._onObserved = function (element, details) {
      var d = GetElementTransaction.getElementData(_this._tabster, element, _this._win, _this._ctx, getWindowUId(_this._win()));
      d.state = CrossOriginStates.Observed;
      d.observedName = details.name;
      d.observedDetails = details.details;

      _this._transactions.beginTransaction(StateTransaction, d);
    };

    this._outlineSetup = function (props) {
      _this._transactions.beginTransaction(StateTransaction, {
        state: CrossOriginStates.Outline,
        ownerUId: getWindowUId(_this._win()),
        outline: props
      });
    };

    this._tabster = tabster;
    this._win = tabster.getWindow;
    this._ctx = {
      ignoreKeyboardNavigationStateUpdate: false,
      deloserByUId: {}
    };
    this._transactions = new CrossOriginTransactions(tabster, this._win, this._ctx);
    this.focusedElement = new CrossOriginFocusedElementState(this._transactions);
    this.observedElement = new CrossOriginObservedElementState(tabster, this._transactions);
  }

  CrossOriginAPI.prototype.setup = function (sendUp) {
    if (this.isSetUp()) {
      return this._transactions.setSendUp(sendUp);
    } else {
      this._initTimer = this._win().setTimeout(this._init, 0);
      return this._transactions.setup(sendUp);
    }
  };

  CrossOriginAPI.prototype.isSetUp = function () {
    return this._transactions.isSetUp;
  };

  CrossOriginAPI.prototype.dispose = function () {
    var _a;

    if (this._initTimer) {
      this._win().clearTimeout(this._initTimer);

      this._initTimer = undefined;
    }

    var tabster = this._tabster;
    tabster.keyboardNavigation.unsubscribe(this._onKeyboardNavigationStateChanged);
    tabster.focusedElement.unsubscribe(this._onFocus);
    (_a = tabster.observedElement) === null || _a === void 0 ? void 0 : _a.unsubscribe(this._onObserved);

    this._transactions.dispose();

    CrossOriginFocusedElementState.dispose(this.focusedElement);
    CrossOriginObservedElementState.dispose(this.observedElement);
    this._ctx.deloserByUId = {};
  };

  CrossOriginAPI.dispose = function (instance) {
    instance.dispose();
  };

  return CrossOriginAPI;
}();

function getDeloserUID(getWindow, context, deloser) {
  var deloserElement = deloser.getElement();

  if (deloserElement) {
    var uid = getElementUId(getWindow, deloserElement);

    if (!context.deloserByUId[uid]) {
      context.deloserByUId[uid] = deloser;
    }

    return uid;
  }

  return undefined;
}

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

var _focusableSelector = /*#__PURE__*/['a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])', '*[tabindex]', '*[contenteditable]'].join(', ');

var _isVisibleTimeout = 200;
var _lastId = 0;

var UberGroupper =
/*#__PURE__*/

/** @class */
function () {
  function UberGroupper(tabster, element, getWindow, current) {
    this._visibleGrouppers = {};
    this._hasFullyVisibleGroupper = false;
    this._prevVisibleGrouppers = {};
    this._grouppers = {};
    this._tabster = tabster;
    this._win = getWindow;
    this._cur = current;
    this._element = new WeakHTMLElement(getWindow, element);
    this.id = 'fgc' + ++_lastId;
    setTabsterOnElement(tabster, element, {
      uberGroupper: this
    });
    UberGroupper._containers[this.id] = this;
  }

  UberGroupper.prototype.dispose = function () {
    this._grouppers = {};

    var win = this._win();

    if (this._updateVisibleTimer) {
      win.clearTimeout(this._updateVisibleTimer);
      this._updateVisibleTimer = undefined;
    }

    if (this._onChangeTimer) {
      win.clearTimeout(this._onChangeTimer);
      this._onChangeTimer = undefined;
    }

    var e = this._element.get();

    if (e) {
      setTabsterOnElement(this._tabster, e, {
        uberGroupper: undefined
      });
    }

    delete UberGroupper._containers[this.id];
  };

  UberGroupper.prototype.getElement = function () {
    return this._element.get();
  };

  UberGroupper.prototype.addGroupper = function (groupper) {
    this._grouppers[groupper.id] = groupper;

    this._setFirstLast();

    this._updateVisible(true);
  };

  UberGroupper.prototype.removeGroupper = function (groupper) {
    var id = groupper.id;
    delete this._grouppers[id];
    delete this._visibleGrouppers[id];
    delete this._prevVisibleGrouppers[id];
    delete this._cur.focused[id];

    if (this._current === groupper) {
      this._setCurrent(undefined);
    }

    this._setFirstLast();

    this._updateVisible(true);
  };

  UberGroupper.prototype.setFocusedGroupper = function (groupper) {
    if (groupper !== this._focused) {
      this._focused = groupper;

      this._processOnChange();
    }
  };

  UberGroupper.prototype.setUnlimitedGroupper = function (groupper) {
    if (groupper !== this._unlimited) {
      this._unlimited = groupper;

      this._processOnChange();
    }
  };

  UberGroupper.prototype.forceUpdate = function () {
    this._processOnChange(true);
  };

  UberGroupper.prototype._processOnChange = function (force) {
    var _this = this;

    if (this._onChangeTimer && !force) {
      return;
    }

    var reallyProcessOnChange = function reallyProcessOnChange() {
      _this._onChangeTimer = undefined;
      var changed = [];

      if (_this._prevFocused !== _this._focused) {
        for (var _i = 0, _a = Object.keys(_this._grouppers); _i < _a.length; _i++) {
          var id = _a[_i];
          changed.push(_this._grouppers[id]);
        }

        if (!_this._focused && (!_this._prevFocused || !_this._prevFocused.getBasicProps().memorizeCurrent)) {
          _this._setCurrent(undefined);

          _this._prev = undefined;
          _this._next = undefined;
        }

        _this._prevFocused = _this._focused;
      }

      if (_this._prevCurrent !== _this._current) {
        changed.push(_this._prevCurrent);
        changed.push(_this._current);
        _this._prevCurrent = _this._current;
      }

      if (_this._prevPrev !== _this._prev) {
        changed.push(_this._prevPrev);
        changed.push(_this._prev);
        _this._prevPrev = _this._prev;
      }

      if (_this._prevNext !== _this._next) {
        changed.push(_this._prevNext);
        changed.push(_this._next);
        _this._prevNext = _this._next;
      }

      if (_this._prevFirst !== _this._first) {
        changed.push(_this._prevFirst);
        changed.push(_this._first);
        _this._prevFirst = _this._first;
      }

      if (_this._prevLast !== _this._last) {
        changed.push(_this._prevLast);
        changed.push(_this._last);
        _this._prevLast = _this._last;
      }

      if (_this._prevUnlimited !== _this._unlimited) {
        changed.push(_this._prevUnlimited);
        changed.push(_this._unlimited);
        _this._prevUnlimited = _this._unlimited;
      }

      if (_this._visibleGrouppers !== _this._prevVisibleGrouppers) {
        _this._hasFullyVisibleGroupper = false;

        for (var _b = 0, _c = Object.keys(_this._visibleGrouppers); _b < _c.length; _b++) {
          var id = _c[_b];
          var isVisible = _this._visibleGrouppers[id];

          if (isVisible !== _this._prevVisibleGrouppers[id]) {
            changed.push(_this._grouppers[id]);
          }

          if (isVisible === ElementVisibilities.Visible) {
            _this._hasFullyVisibleGroupper = true;
          }
        }

        for (var _d = 0, _e = Object.keys(_this._prevVisibleGrouppers); _d < _e.length; _d++) {
          var id = _e[_d];

          if (_this._visibleGrouppers[id] !== _this._prevVisibleGrouppers[id]) {
            changed.push(_this._grouppers[id]);
          }
        }

        _this._prevVisibleGrouppers = _this._visibleGrouppers;
      }

      var processed = {};

      for (var _f = 0, _g = changed.filter(function (c) {
        return c && _this._grouppers[c.id];
      }); _f < _g.length; _f++) {
        var g = _g[_f];

        if (g && !processed[g.id]) {
          processed[g.id] = true;
          var onChange = g.getExtendedProps().onChange;

          if (onChange) {
            onChange(g.getState());
          }
        }
      }
    };

    if (this._onChangeTimer) {
      this._win().clearTimeout(this._onChangeTimer);
    }

    if (force) {
      reallyProcessOnChange();
    } else {
      this._onChangeTimer = this._win().setTimeout(reallyProcessOnChange, 0);
    }
  };

  UberGroupper.prototype._setFirstLast = function () {
    this._first = undefined;
    this._last = undefined;

    var element = this._element.get();

    if (!element) {
      return;
    }

    for (var e = element.firstElementChild; e; e = e.nextElementSibling) {
      var tabsterOnElement = getTabsterOnElement(this._tabster, e);

      if (tabsterOnElement && tabsterOnElement.groupper && tabsterOnElement.groupper.id in this._grouppers) {
        this._first = tabsterOnElement.groupper;
        break;
      }
    }

    for (var e = element.lastElementChild; e; e = e.previousElementSibling) {
      var tabsterOnElement = getTabsterOnElement(this._tabster, e);

      if (tabsterOnElement && tabsterOnElement.groupper && tabsterOnElement.groupper.id in this._grouppers) {
        this._last = tabsterOnElement.groupper;
        break;
      }
    }

    this._processOnChange();
  };

  UberGroupper.prototype.setCurrentGroupper = function (groupper) {
    var _a;

    this._setCurrent(groupper && groupper.id in this._grouppers ? groupper : undefined);

    this._prev = undefined;
    this._next = undefined;
    var curElement = (_a = this._current) === null || _a === void 0 ? void 0 : _a.getElement();

    if (curElement && curElement.parentElement === this._element.get()) {
      for (var e = curElement.previousElementSibling; e; e = e.previousElementSibling) {
        var tabsterOnElement = getTabsterOnElement(this._tabster, e);

        if (tabsterOnElement && tabsterOnElement.groupper) {
          this._prev = tabsterOnElement.groupper;
          break;
        }
      }

      for (var e = curElement.nextElementSibling; e; e = e.nextElementSibling) {
        var tabsterOnElement = getTabsterOnElement(this._tabster, e);

        if (tabsterOnElement && tabsterOnElement.groupper) {
          this._next = tabsterOnElement.groupper;
          break;
        }
      }
    }

    this._processOnChange();
  };

  UberGroupper.prototype.getCurrentGroupper = function () {
    if (this._current && this._current.id in this._grouppers) {
      return this._current;
    }

    this._setCurrent(undefined);

    return this._current || null;
  };

  UberGroupper.prototype.getGroupperState = function (groupper) {
    var props = groupper.getBasicProps();
    var isLimited = props.isLimited;
    var isVisible = this._visibleGrouppers[groupper.id] || ElementVisibilities.Invisible;
    var isCurrent = this._current ? this._current === groupper : undefined;

    if (isCurrent === undefined && props.lookupVisibility !== ElementVisibilities.Invisible) {
      if (isVisible === ElementVisibilities.Invisible || this._hasFullyVisibleGroupper && isVisible === ElementVisibilities.PartiallyVisible) {
        isCurrent = false;
      }
    }

    return {
      isCurrent: isCurrent,
      isPrevious: this._prev === groupper,
      isNext: this._next === groupper,
      isFirst: this._first === groupper,
      isLast: this._last === groupper,
      isVisible: isVisible,
      hasFocus: this._focused === groupper,
      siblingHasFocus: !!this._focused && this._focused !== groupper,
      siblingIsVisible: this._hasFullyVisibleGroupper,
      isLimited: isLimited === GroupperFocusLimits.Limited || isLimited === GroupperFocusLimits.LimitedTrapFocus ? this._unlimited !== groupper : false
    };
  };

  UberGroupper.prototype.isEmpty = function () {
    return Object.keys(this._grouppers).length === 0;
  };

  UberGroupper.prototype._setCurrent = function (groupper) {
    var cur = this._current;

    if (cur !== groupper) {
      if (cur && this._cur.current[cur.id]) {
        delete this._cur.current[cur.id];
      }

      if (groupper) {
        this._cur.current[groupper.id] = groupper;
      }

      this._current = groupper;
    }
  };

  UberGroupper.prototype._updateVisible = function (updateParents) {
    var _this = this;

    var element = this._element.get();

    if (this._updateVisibleTimer || !element) {
      return;
    }

    if (updateParents) {
      for (var e = element.parentElement; e; e = e.parentElement) {
        var tabsterOnElement = getTabsterOnElement(this._tabster, e);

        if (tabsterOnElement && tabsterOnElement.uberGroupper) {
          tabsterOnElement.uberGroupper._updateVisible(false);
        }
      }
    }

    this._updateVisibleTimer = this._win().setTimeout(function () {
      _this._updateVisibleTimer = undefined;
      var isChanged = false;
      var visibleGrouppers = {};

      for (var _i = 0, _a = Object.keys(_this._grouppers); _i < _a.length; _i++) {
        var id = _a[_i];

        var groupperElement = _this._grouppers[id].getElement();

        var isVisible = groupperElement ? isElementVisibleInContainer(_this._win, groupperElement, 10) : ElementVisibilities.Invisible;
        var curIsVisible = _this._visibleGrouppers[id] || ElementVisibilities.Invisible;

        if (isVisible !== ElementVisibilities.Invisible) {
          visibleGrouppers[id] = isVisible;
        }

        if (curIsVisible !== isVisible) {
          isChanged = true;
        }
      }

      if (isChanged) {
        _this._prevVisibleGrouppers = _this._visibleGrouppers;
        _this._visibleGrouppers = visibleGrouppers;

        _this._processOnChange();
      }
    }, 0);
  };

  UberGroupper.updateVisible = function (scrolled) {
    var containers = {};

    for (var _i = 0, scrolled_1 = scrolled; _i < scrolled_1.length; _i++) {
      var s = scrolled_1[_i];

      for (var _a = 0, _b = Object.keys(UberGroupper._containers); _a < _b.length; _a++) {
        var id = _b[_a];
        var container = UberGroupper._containers[id];
        var containerElement = container.getElement();

        if (containerElement && s.contains(containerElement)) {
          containers[container.id] = container;
        }
      }
    }

    for (var _c = 0, _d = Object.keys(containers); _c < _d.length; _c++) {
      var id = _d[_c];

      containers[id]._updateVisible(false);
    }
  };

  UberGroupper._containers = {};
  return UberGroupper;
}();

var Groupper =
/*#__PURE__*/

/** @class */
function () {
  function Groupper(tabster, element, getWindow, current, basic, extended) {
    this._tabster = tabster;
    this._win = getWindow;
    this._cur = current;
    this._element = new WeakHTMLElement(getWindow, element);
    this._basic = basic || {};
    this._extended = extended || {};
    this.id = 'fg' + ++_lastId;
    setTabsterOnElement(this._tabster, element, {
      groupper: this
    });
    this.setupContainer();
  }

  Groupper.prototype.dispose = function () {
    if (this._container) {
      this._container.removeGroupper(this);
    }

    this.setupContainer(true);

    var element = this._element.get();

    if (element) {
      setTabsterOnElement(this._tabster, element, {
        groupper: undefined
      });
    }
  };

  Groupper.prototype.getBasicProps = function () {
    return this._basic;
  };

  Groupper.prototype.getExtendedProps = function () {
    return this._extended;
  };

  Groupper.prototype.setProps = function (basic, extended) {
    if (basic) {
      this._basic = __assign(__assign({}, this._basic), basic);
    } else if (basic === null) {
      this._basic = {};
    }

    if (extended) {
      this._extended = __assign(__assign({}, this._extended), extended);
    } else if (extended === null) {
      this._extended = {};
    }
  };

  Groupper.prototype.getElement = function () {
    return this._element.get();
  };

  Groupper.prototype.moveTo = function (newElement) {
    if (this._element.get() !== newElement) {
      this.setupContainer(true);
      this._element = new WeakHTMLElement(this._win, newElement);
      this.setupContainer();
    }
  };

  Groupper.prototype.getState = function () {
    return this._container ? this._container.getGroupperState(this) : {
      isCurrent: undefined,
      isPrevious: false,
      isNext: false,
      isFirst: false,
      isLast: false,
      isVisible: ElementVisibilities.Invisible,
      hasFocus: false,
      siblingIsVisible: false,
      siblingHasFocus: false,
      isLimited: false
    };
  };

  Groupper.prototype.setCurrent = function (current) {
    if (this._container) {
      this._container.setCurrentGroupper(current ? this : undefined);
    }
  };

  Groupper.prototype.isDefault = function () {
    var isDefault = this._basic.isDefault || this._extended.isDefault;
    return typeof isDefault === 'function' ? isDefault.call(this._element) : isDefault;
  };

  Groupper.prototype.setFocused = function (focused) {
    if (this._container) {
      this._container.setFocusedGroupper(focused ? this : undefined);
    }
  };

  Groupper.prototype.setUnlimited = function (unlimited) {
    if (this._container && (this._basic.isLimited === GroupperFocusLimits.Limited || this._basic.isLimited === GroupperFocusLimits.LimitedTrapFocus)) {
      this._container.setUnlimitedGroupper(unlimited ? this : undefined);
    }
  };

  Groupper.prototype.forceUpdate = function () {
    if (this._container) {
      this._container.forceUpdate();
    }
  };

  Groupper.prototype.setupContainer = function (remove) {
    var element = this._element.get();

    var containerElement = element === null || element === void 0 ? void 0 : element.parentElement;
    var curContainer = this._container;
    var container;

    if (containerElement) {
      var containerTabsterOnElement = getTabsterOnElement(this._tabster, containerElement);
      container = containerTabsterOnElement && containerTabsterOnElement.uberGroupper;

      if (!container && !remove) {
        container = new UberGroupper(this._tabster, containerElement, this._win, this._cur);
      }
    }

    if (curContainer && (remove || curContainer !== container)) {
      curContainer.removeGroupper(this);
    }

    this._container = container;

    if (container && !remove) {
      container.addGroupper(this);
    }
  };

  return Groupper;
}();

var FocusableAPI =
/*#__PURE__*/

/** @class */
function () {
  function FocusableAPI(tabster, getWindow) {
    var _this = this;

    this._scrollTargets = [];

    this._init = function () {
      _this._initTimer = undefined;

      var win = _this._win();

      win.document.addEventListener(MUTATION_EVENT_NAME, _this._onMutation, true); // Capture!

      win.addEventListener('scroll', _this._onScroll, true);

      _this._tabster.focusedElement.subscribe(_this._onFocus);
    };

    this._onFocus = function (element) {
      if (element) {
        _this._updateFocusedGrouppers(element);
      }
    };

    this._onMutation = function (e) {
      if (!e.target || !e.details.groupper) {
        return;
      }

      e.details.groupper.setupContainer(e.details.removed);
    };

    this._onScroll = function (e) {
      var isKnownTarget = false;

      for (var _i = 0, _a = _this._scrollTargets; _i < _a.length; _i++) {
        var t = _a[_i];

        if (t === e.target) {
          isKnownTarget = true;
          break;
        }
      } // Cannot simply use (e.target instanceof Node) as it might
      // originate from another window.


      if (!isKnownTarget && e.target.contains) {
        _this._scrollTargets.push(e.target);
      }

      var win = _this._win();

      if (_this._scrollTimer) {
        win.clearTimeout(_this._scrollTimer);
      }

      _this._scrollTimer = win.setTimeout(function () {
        _this._scrollTimer = undefined;
        UberGroupper.updateVisible(_this._scrollTargets);
        _this._scrollTargets = [];
      }, _isVisibleTimeout);
    };

    this._tabster = tabster;
    this._win = getWindow;
    this._cur = {
      focused: {},
      current: {}
    };
    this._initTimer = getWindow().setTimeout(this._init, 0);
  }

  FocusableAPI.prototype.dispose = function () {
    var win = this._win();

    if (this._initTimer) {
      win.clearTimeout(this._initTimer);
      this._initTimer = undefined;
    }

    if (this._scrollTimer) {
      win.clearTimeout(this._scrollTimer);
      this._scrollTimer = undefined;
    }

    win.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation, true); // Capture!

    win.removeEventListener('scroll', this._onScroll, true);

    this._tabster.focusedElement.unsubscribe(this._onFocus);

    this._scrollTargets = [];
  };

  FocusableAPI.dispose = function (instance) {
    instance.dispose();
  };

  FocusableAPI.prototype._getBody = function () {
    var last = this._tabster.focusedElement.getLastFocusedElement();

    if (last && last.ownerDocument) {
      return last.ownerDocument.body;
    }

    return this._win().document.body;
  };

  FocusableAPI.forgetFocusedGrouppers = function (instance) {
    instance._updateFocusedGrouppers(null, true);
  };

  FocusableAPI.prototype._updateFocusedGrouppers = function (element, forceUpdate) {
    var newFocusedGrouppers = {};

    for (var el = element; el; el = el.parentElement) {
      var tabsterOnElement = getTabsterOnElement(this._tabster, el);

      if (tabsterOnElement && tabsterOnElement.groupper) {
        newFocusedGrouppers[tabsterOnElement.groupper.id] = tabsterOnElement.groupper;
      }
    }

    for (var _i = 0, _a = Object.keys(this._cur.focused); _i < _a.length; _i++) {
      var gid = _a[_i];

      if (!newFocusedGrouppers[gid]) {
        var g = this._cur.focused[gid];
        g.setFocused(false);
        g.setUnlimited(false);

        if (forceUpdate) {
          g.forceUpdate();
        }
      }
    }

    for (var _b = 0, _c = Object.keys(newFocusedGrouppers); _b < _c.length; _b++) {
      var gid = _c[_b];

      if (!this._cur.focused[gid]) {
        var g = newFocusedGrouppers[gid];
        var groupElement = g.getElement();

        if (groupElement) {
          g.setFocused(true);

          if (element !== this._getGroupFirst(groupElement, false)) {
            g.setUnlimited(true);
          }
        }
      }
    }

    this._cur.focused = newFocusedGrouppers;
  };

  FocusableAPI.prototype._getGroupFirst = function (groupElement, ignoreGroupper) {
    return this._tabster.focusable.isFocusable(groupElement) ? groupElement : this._tabster.focusable.findFirst(groupElement, false, ignoreGroupper);
  };

  FocusableAPI.prototype.addGroupper = function (element, basic, extended) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);

    if (tabsterOnElement && tabsterOnElement.groupper) {
      throw new Error('The element already has a focus group');
    }

    var groupper = new Groupper(this._tabster, element, this._win, this._cur, basic, extended);
    dispatchMutationEvent(element, {
      groupper: groupper
    });
  };

  FocusableAPI.prototype.removeGroupper = function (element) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);
    var groupper = tabsterOnElement && tabsterOnElement.groupper;

    if (groupper) {
      groupper.dispose();
      dispatchMutationEvent(element, {
        groupper: groupper,
        removed: true
      });
    }
  };

  FocusableAPI.prototype.moveGroupper = function (from, to) {
    if (from !== to) {
      var tabsterOnElementFrom = getTabsterOnElement(this._tabster, from);
      var groupper = tabsterOnElementFrom && tabsterOnElementFrom.groupper;

      if (groupper) {
        groupper.moveTo(to);
        dispatchMutationEvent(from, {
          groupper: groupper,
          removed: true
        });
        dispatchMutationEvent(to, {
          groupper: groupper
        });
      }
    }
  };

  FocusableAPI.prototype.setGroupperProps = function (element, basic, extended) {
    var groupper = this._findGroupper(element);

    if (groupper) {
      groupper.setProps(basic, extended);
    }
  };

  FocusableAPI.prototype.setCurrentGroupper = function (element, forceUpdate) {
    var _a;

    var groupper = element ? this._findGroupper(element) : null;

    if (element === null) {
      for (var _i = 0, _b = Object.keys(this._cur.current); _i < _b.length; _i++) {
        var gid = _b[_i];
        var g = this._cur.current[gid];
        g.setCurrent(false);

        if (forceUpdate) {
          g.forceUpdate();
        }
      }
    } else {
      while (groupper) {
        groupper.setCurrent(true);

        if (forceUpdate) {
          groupper.forceUpdate();
        }

        var parentEl = (_a = groupper.getElement()) === null || _a === void 0 ? void 0 : _a.parentElement;
        groupper = parentEl ? this._findGroupper(parentEl) : null;
      }
    }
  };

  FocusableAPI.prototype.isInCurrentGroupper = function (element) {
    return this._isInCurrentGroupper(element, false);
  };

  FocusableAPI.prototype._isInCurrentGroupper = function (element, unlimitedOnly) {
    var groupper = this._findGroupper(element);

    var groupElement = groupper === null || groupper === void 0 ? void 0 : groupper.getElement();

    if (!groupper || !groupElement) {
      return undefined;
    }

    var isValidForLimited = false;

    if (unlimitedOnly) {
      // For a limited group only first focusable in the group is valid.
      isValidForLimited = element.contains(this._getGroupFirst(groupElement, true));
    }

    while (groupper) {
      var state = groupper.getState();

      if (state.isCurrent === false) {
        return false;
      }

      if (unlimitedOnly && state.isLimited && !isValidForLimited) {
        return false;
      }

      var parentEl = groupElement === null || groupElement === void 0 ? void 0 : groupElement.parentElement;
      groupper = parentEl ? this._findGroupper(parentEl) : null;

      if (groupper) {
        groupElement = groupper.getElement();
      }
    }

    return true;
  };

  FocusableAPI.prototype._findGroupper = function (element) {
    for (var el = element; el; el = el.parentElement) {
      var tabsterOnElement = getTabsterOnElement(this._tabster, el);

      if (tabsterOnElement && tabsterOnElement.groupper) {
        return tabsterOnElement.groupper;
      }
    }

    return null;
  };

  FocusableAPI.prototype.findGroupper = function (element) {
    var groupper = this._findGroupper(element);

    return groupper ? groupper.getElement() || null : null;
  };

  FocusableAPI.prototype._findNextGroupper = function (element, next, ignoreModalizer) {
    var cur = this.findGroupper(element);
    var containerElement = cur && cur.parentElement;

    if (cur && containerElement) {
      var tabsterOnElement = getTabsterOnElement(this._tabster, containerElement);
      var container = tabsterOnElement && tabsterOnElement.uberGroupper;

      if (container) {
        for (var el = next(container, cur); el; el = next(container, cur, el)) {
          var groupperTabsterOnElement = getTabsterOnElement(this._tabster, el);

          if (groupperTabsterOnElement && groupperTabsterOnElement.groupper && (ignoreModalizer || this.isAccessible(el))) {
            if (!this._tabster.focusable.isFocusable(el) && !this._tabster.focusable.findFirst(el, false, true)) {
              continue;
            }

            return el;
          }
        }
      }
    }

    return null;
  };

  FocusableAPI.prototype.findFirstGroupper = function (context, ignoreModalizer) {
    return this._findNextGroupper(context, function (container, initial, el) {
      var _a;

      return el === undefined ? ((_a = container.getElement()) === null || _a === void 0 ? void 0 : _a.firstElementChild) || null : el ? el.nextElementSibling : null;
    }, ignoreModalizer);
  };

  FocusableAPI.prototype.findLastGroupper = function (context, ignoreModalizer) {
    return this._findNextGroupper(context, function (container, initial, el) {
      var _a;

      return el === undefined ? ((_a = container.getElement()) === null || _a === void 0 ? void 0 : _a.lastElementChild) || null : el ? el.previousElementSibling : null;
    }, ignoreModalizer);
  };

  FocusableAPI.prototype.findNextGroupper = function (context, ignoreModalizer) {
    return this._findNextGroupper(context, function (container, initial, el) {
      return el === undefined ? initial.nextElementSibling : el ? el.nextElementSibling : null;
    }, ignoreModalizer);
  };

  FocusableAPI.prototype.findPrevGroupper = function (context, ignoreModalizer) {
    return this._findNextGroupper(context, function (container, initial, el) {
      return el === undefined ? initial.previousElementSibling : el ? el.previousElementSibling : null;
    }, ignoreModalizer);
  };

  FocusableAPI.prototype.getProps = function (element) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);
    return tabsterOnElement && tabsterOnElement.focusable || {};
  };

  FocusableAPI.prototype.setProps = function (element, props) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);
    var curProps = tabsterOnElement && tabsterOnElement.focusable || {};
    var newProps = {};

    if (props) {
      newProps.isDefault = props.isDefault;
      newProps.isIgnored = props.isIgnored;
      newProps.mover = props.mover;
      newProps.ignoreAriaDisabled = props.ignoreAriaDisabled;
    }

    if (curProps.isDefault !== newProps.isDefault || curProps.isIgnored !== newProps.isIgnored || curProps.mover !== newProps.mover || curProps.ignoreAriaDisabled !== newProps.ignoreAriaDisabled) {
      setTabsterOnElement(this._tabster, element, {
        focusable: newProps
      });
    }
  };

  FocusableAPI.prototype.isFocusable = function (el, includeProgrammaticallyFocusable, noVisibleCheck, noAccessibleCheck) {
    if (matchesSelector(el, _focusableSelector) && (includeProgrammaticallyFocusable || el.tabIndex !== -1)) {
      return (noVisibleCheck || this.isVisible(el)) && (noAccessibleCheck || this.isAccessible(el));
    }

    return false;
  };

  FocusableAPI.prototype.isVisible = function (el) {
    if (!el.ownerDocument) {
      return false;
    }

    if (el.offsetParent === null && el.ownerDocument.body !== el) {
      return false;
    }

    var win = el.ownerDocument.defaultView;

    if (!win) {
      return false;
    }

    var rect = el.ownerDocument.body.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      // This might happen, for example, if our <body> is in hidden <iframe>.
      return false;
    }

    var computedStyle = win.getComputedStyle(el);

    if (computedStyle.visibility === 'hidden') {
      return false;
    }

    return true;
  };

  FocusableAPI.prototype.isAccessible = function (el) {
    var _a;

    for (var e = el; e; e = e.parentElement) {
      var tabsterOnElement = getTabsterOnElement(this._tabster, e);

      if (this._isHidden(e)) {
        return false;
      }

      var ignoreDisabled = (_a = tabsterOnElement === null || tabsterOnElement === void 0 ? void 0 : tabsterOnElement.focusable) === null || _a === void 0 ? void 0 : _a.ignoreAriaDisabled;

      if (!ignoreDisabled && this._isDisabled(e)) {
        return false;
      }
    }

    return true;
  };

  FocusableAPI.prototype._attrIs = function (el, name, value) {
    var attrVal = el.getAttribute(name);

    if (attrVal && attrVal.toLowerCase() === value) {
      return true;
    }

    return false;
  };

  FocusableAPI.prototype._isDisabled = function (el) {
    return this._attrIs(el, 'aria-disabled', 'true');
  };

  FocusableAPI.prototype._isHidden = function (el) {
    return this._attrIs(el, 'aria-hidden', 'true');
  };

  FocusableAPI.prototype.findFirst = function (context, includeProgrammaticallyFocusable, ignoreGroupper) {
    return this._findElement(context || this._getBody(), null, includeProgrammaticallyFocusable, ignoreGroupper, false);
  };

  FocusableAPI.prototype.findLast = function (context, includeProgrammaticallyFocusable, ignoreGroupper) {
    return this._findElement(context || this._getBody(), null, includeProgrammaticallyFocusable, ignoreGroupper, true);
  };

  FocusableAPI.prototype.findNext = function (current, context, includeProgrammaticallyFocusable, ignoreGroupper) {
    return this._findElement(context || this._getBody(), current, includeProgrammaticallyFocusable, ignoreGroupper, false);
  };

  FocusableAPI.prototype.findPrev = function (current, context, includeProgrammaticallyFocusable, ignoreGroupper) {
    return this._findElement(context || this._getBody(), current, includeProgrammaticallyFocusable, ignoreGroupper, true);
  };

  FocusableAPI.prototype.findDefault = function (context, includeProgrammaticallyFocusable, ignoreGroupper) {
    var _this = this;

    return this._findElement(context || this._getBody(), null, includeProgrammaticallyFocusable, ignoreGroupper, false, function (el) {
      return _this._tabster.focusable.isFocusable(el, includeProgrammaticallyFocusable) && !!_this.getProps(el).isDefault;
    });
  };
  /**
   * Finds all focusables in a given context that satisfy an given condition
   *
   * @param context @see {@link _findElement}
   * @param customFilter A callback that checks whether an element should be added to results
   * @param ignoreProgrammaticallyFocusable @see {@link _findElement}
   * @param ignoreGroupper @see {@link _findElement}
   * @param skipDefaultCondition skips the default condition that leverages @see {@link isFocusable}, be careful using this
   */


  FocusableAPI.prototype.findAll = function (context, customFilter, includeProgrammaticallyFocusable, ignoreGroupper, skipDefaultCondition) {
    var _this = this;

    var acceptCondition = function acceptCondition(el) {
      var defaultCheck = _this._tabster.focusable.isFocusable(el, includeProgrammaticallyFocusable);

      var customCheck = customFilter(el);

      if (skipDefaultCondition) {
        return !!customCheck;
      }

      return defaultCheck && !!customCheck;
    };

    var walker = createElementTreeWalker(context.ownerDocument, context, function (node) {
      return _this._acceptElement(node, acceptCondition, ignoreGroupper);
    });
    var nodeFilter = walker === null || walker === void 0 ? void 0 : walker.filter;

    if (!walker || !context || !nodeFilter) {
      return [];
    }

    var foundNodes = [];
    var node;

    while (node = walker.nextNode()) {
      foundNodes.push(node);
    }

    return foundNodes;
  };

  FocusableAPI.prototype._findElement = function (container, currentElement, includeProgrammaticallyFocusable, ignoreGroupper, prev, acceptCondition) {
    var _this = this;

    if (!container) {
      return null;
    }

    if (!container.ownerDocument || currentElement && container !== currentElement && !container.contains(currentElement)) {
      return null;
    }

    if (!acceptCondition) {
      acceptCondition = function acceptCondition(el) {
        return _this._tabster.focusable.isFocusable(el, includeProgrammaticallyFocusable);
      };
    }

    var walker = createElementTreeWalker(container.ownerDocument, container, function (node) {
      return _this._acceptElement(node, acceptCondition, ignoreGroupper);
    });

    if (!walker) {
      return null;
    }

    if (currentElement) {
      walker.currentNode = currentElement;
    } else if (prev) {
      var lastChild = null;

      for (var i = container.lastElementChild; i; i = i.lastElementChild) {
        lastChild = i;
      }

      if (!lastChild) {
        return null;
      }

      if (this._acceptElement(lastChild, acceptCondition, ignoreGroupper) === NodeFilter.FILTER_ACCEPT) {
        return lastChild;
      } else {
        walker.currentNode = lastChild;
      }
    }

    return prev ? walker.previousNode() : walker.nextNode();
  };

  FocusableAPI.prototype._acceptElement = function (element, acceptCondition, ignoreGroupper) {
    var ctx = RootAPI.getTabsterContext(this._tabster, element); // Tabster is opt in, if it is not managed, don't try and get do anything special

    if (!ctx) {
      return NodeFilter.FILTER_SKIP;
    }

    if (!this.isAccessible(element)) {
      return NodeFilter.FILTER_REJECT;
    }

    if (ignoreGroupper && this._isInCurrentGroupper(element, true) === false) {
      return NodeFilter.FILTER_REJECT;
    }

    return acceptCondition(element) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
  };

  return FocusableAPI;
}();

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

var _inputSelector = /*#__PURE__*/['input', 'textarea', '*[contenteditable]'].join(', ');

function canOverrideNativeFocus(win) {
  var HTMLElement = win.HTMLElement;
  var origFocus = HTMLElement.prototype.focus;
  var isCustomFocusCalled = false;

  HTMLElement.prototype.focus = function focus() {
    isCustomFocusCalled = true;
  };

  var btn = win.document.createElement('button');
  btn.focus();
  HTMLElement.prototype.focus = origFocus;
  return isCustomFocusCalled;
}

var FocusedElementState =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(FocusedElementState, _super);

  function FocusedElementState(tabster, getWindow) {
    var _this = _super.call(this) || this;

    _this._canOverrideNativeFocus = false;

    _this._init = function () {
      _this._initTimer = undefined;

      var win = _this._win();

      _this._canOverrideNativeFocus = canOverrideNativeFocus(win);
      FocusedElementState.replaceFocus(_this._win); // Add these event listeners as capture - we want Tabster to run before user event handlers

      win.document.addEventListener('focusin', _this._onFocusIn, true);
      win.document.addEventListener('focusout', _this._onFocusOut, true);
      win.document.addEventListener('mousedown', _this._onMouseDown, true);
      win.addEventListener('keydown', _this._onKeyDown, true);
    };

    _this._onFocusIn = function (e) {
      _this._setFocusedElement(e.target, e.relatedTarget || undefined);
    };

    _this._onFocusOut = function (e) {
      _this._setFocusedElement(undefined, e.relatedTarget || undefined);
    };

    _this._onMouseDown = function (e) {
      var groupper = _this._tabster.focusable.findGroupper(e.target);

      if (groupper) {
        _this._tabster.focusable.setCurrentGroupper(groupper);
      }
    };

    _this._onKeyDown = function (e) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;

      var curElement = _this.getVal();

      if (!curElement || !curElement.ownerDocument) {
        return;
      }

      switch (e.keyCode) {
        case Keys.Enter:
        case Keys.Esc:
        case Keys.Tab:
        case Keys.Down:
        case Keys.Right:
        case Keys.Up:
        case Keys.Left:
        case Keys.PageDown:
        case Keys.PageUp:
        case Keys.Home:
        case Keys.End:
          break;

        default:
          return;
      }

      var ctx = RootAPI.getTabsterContext(_this._tabster, curElement, {
        checkRtl: true
      });
      var keyCode = e.keyCode;
      var isTab = keyCode === Keys.Tab;
      var isNotGroupperCase = (isTab || ctx && ctx.mover && !ctx.isGroupperFirst) && keyCode !== Keys.Enter && keyCode !== Keys.Esc;

      if (isNotGroupperCase) {
        if (!ctx) {
          // Do not custom-handle the Tab press when nothing is to custom-handle.
          return;
        }

        var isPrev = isTab && e.shiftKey || !isTab && (keyCode === Keys.Left && !ctx.isRtl || keyCode === Keys.Right && ctx.isRtl || keyCode === Keys.Up || keyCode === Keys.PageUp || keyCode === Keys.Home);
        var fromElement = curElement; // If the current element is in a mover, move to the mover boundaries since a mover is considered a single tabstop

        if (isTab && ctx.mover && ((_a = ctx.moverOptions) === null || _a === void 0 ? void 0 : _a.navigationType) === MoverKeys.Arrows) {
          // Consider nested movers a as a single tab stop, go up until there is no more mover
          var parentCtx = ctx;
          var rootMover = ctx.mover;

          while ((_b = parentCtx === null || parentCtx === void 0 ? void 0 : parentCtx.mover) === null || _b === void 0 ? void 0 : _b.parentElement) {
            rootMover = parentCtx.mover;
            parentCtx = RootAPI.getTabsterContext(_this._tabster, parentCtx.mover.parentElement);
          }

          if (isPrev) {
            fromElement = _this._tabster.focusable.findFirst(rootMover);
          } else {
            fromElement = _this._tabster.focusable.findLast(rootMover);
          }
        }

        if (!fromElement) {
          return;
        }

        var next = null;

        switch (keyCode) {
          case Keys.Tab:
          case Keys.Up:
          case Keys.Down:
          case Keys.Left:
          case Keys.Right:
            next = isPrev ? _this._tabster.focusable.findPrev(fromElement) : _this._tabster.focusable.findNext(fromElement);
            break;

          case Keys.Home:
            next = ((_c = ctx.mover) === null || _c === void 0 ? void 0 : _c.contains(fromElement)) ? _this._tabster.focusable.findFirst(ctx.mover) : next;
            break;

          case Keys.End:
            next = ((_d = ctx.mover) === null || _d === void 0 ? void 0 : _d.contains(fromElement)) ? _this._tabster.focusable.findLast(ctx.mover) : next;
            break;

          case Keys.PageDown:
          case Keys.PageUp:
            // TODO.
            return;
        }

        if (!isTab && ctx.mover) {
          var horizontalKeysOnVerticalAxis = (keyCode === Keys.Left || keyCode === Keys.Right) && ((_e = ctx.moverOptions) === null || _e === void 0 ? void 0 : _e.axis) === MoverAxis.Vertical;
          var verticalKeysOnHorizontalAxis = (keyCode === Keys.Up || keyCode === Keys.Down) && ((_f = ctx.moverOptions) === null || _f === void 0 ? void 0 : _f.axis) === MoverAxis.Horizontal;

          if (horizontalKeysOnVerticalAxis || verticalKeysOnHorizontalAxis) {
            return;
          }

          if (!next || next && !ctx.mover.contains(next)) {
            // Nowhere to move inside the current Mover.
            e.preventDefault(); // We don't need the page to scroll when we're custom-handling
            // the arrows.

            if (!((_g = ctx.moverOptions) === null || _g === void 0 ? void 0 : _g.cyclic)) {
              return;
            } // cyclic navigation, focus first or last elements in the mover container respectively


            if (isPrev) {
              next = _this._tabster.focusable.findLast(ctx.mover);
            } else {
              next = _this._tabster.focusable.findFirst(ctx.mover);
            }
          }
        }

        var groupper = ctx === null || ctx === void 0 ? void 0 : ctx.groupper;
        var groupperElement = groupper === null || groupper === void 0 ? void 0 : groupper.getElement();

        if (groupper && groupperElement) {
          var first = _this._getFirstInGroupper(groupperElement, false);

          if (first && curElement !== first && groupper.getBasicProps().isLimited === GroupperFocusLimits.LimitedTrapFocus && (!next || next === first || !groupperElement.contains(next))) {
            next = isPrev ? _this._tabster.focusable.findLast(groupperElement) : _this._tabster.focusable.findNext(first, groupperElement);
          } else if (curElement === first && groupperElement.parentElement) {
            var parentGroupper = (_h = RootAPI.getTabsterContext(_this._tabster, groupperElement.parentElement)) === null || _h === void 0 ? void 0 : _h.groupper;
            var parentGroupperElement = parentGroupper === null || parentGroupper === void 0 ? void 0 : parentGroupper.getElement();

            if (parentGroupper && parentGroupperElement && !parentGroupperElement.contains(next) && parentGroupper.getBasicProps().isLimited === GroupperFocusLimits.LimitedTrapFocus) {
              next = curElement;
            }
          }
        }

        if (ctx && ctx.modalizer) {
          var nctx = next && RootAPI.getTabsterContext(_this._tabster, next);

          if (!nctx || ctx.root.uid !== nctx.root.uid || !((_j = nctx.modalizer) === null || _j === void 0 ? void 0 : _j.isActive())) {
            if (ctx.modalizer.onBeforeFocusOut()) {
              e.preventDefault();
              return;
            }
          }
        }

        if (next) {
          e.preventDefault();
          callOriginalFocusOnly(next);
        } else if (ctx) {
          ctx.root.moveOutWithDefaultAction(isPrev);
        }
      } else {
        if ((keyCode === Keys.Left || keyCode === Keys.Right) && _this._isInput(curElement)) {
          return;
        }

        var groupper = ctx === null || ctx === void 0 ? void 0 : ctx.groupper;
        var groupperElement = groupper === null || groupper === void 0 ? void 0 : groupper.getElement();

        if (!groupper || !groupperElement) {
          return;
        }

        var shouldStopPropagation = true;
        var next = null;

        switch (keyCode) {
          case Keys.Enter:
          case Keys.Esc:
            var state = groupper.getState();

            if (e.keyCode === Keys.Enter) {
              if (state.isLimited && curElement === _this._getFirstInGroupper(groupperElement, true)) {
                groupper.setUnlimited(true);
                next = _this._tabster.focusable.findNext(curElement);

                if (!groupperElement.contains(next)) {
                  next = null;
                }

                if (next === null) {
                  shouldStopPropagation = false;
                }
              } else {
                shouldStopPropagation = false;
              }
            } else {
              // Esc
              if (state.isLimited) {
                if (groupperElement.parentElement) {
                  var parentGroupper = (_k = RootAPI.getTabsterContext(_this._tabster, groupperElement.parentElement)) === null || _k === void 0 ? void 0 : _k.groupper;

                  if (parentGroupper) {
                    groupperElement = parentGroupper.getElement();
                    groupper = parentGroupper;
                    state = parentGroupper.getState();
                  }
                }
              }

              if (!state.isLimited) {
                groupper.setUnlimited(false);
                next = groupperElement || null;
              }
            }

            break;

          case Keys.Down:
          case Keys.Right:
          case Keys.Up:
          case Keys.Left:
            next = _this._findNextGroupper(groupperElement, e.keyCode, groupper.getBasicProps().nextDirection, ctx === null || ctx === void 0 ? void 0 : ctx.isRtl);
            break;

          case Keys.PageDown:
            next = _this._findPageDownGroupper(groupperElement);

            if (next) {
              scrollIntoView(_this._win, next, true);
            }

            break;

          case Keys.PageUp:
            next = _this._findPageUpGroupper(groupperElement);

            if (next) {
              scrollIntoView(_this._win, next, false);
            }

            break;

          case Keys.Home:
            if (groupperElement.parentElement) {
              next = _this._tabster.focusable.findFirstGroupper(groupperElement);
            }

            break;

          case Keys.End:
            if (groupperElement.parentElement) {
              next = _this._tabster.focusable.findLastGroupper(groupperElement);
            }

            break;
        }

        if (shouldStopPropagation) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }

        if (next) {
          if (!_this._tabster.focusable.isFocusable(next)) {
            next = _this._tabster.focusable.findFirst(next, false, true);
          }

          if (next) {
            _this._tabster.focusable.setCurrentGroupper(next);

            KeyboardNavigationState.setVal(_this._tabster.keyboardNavigation, true);
            callOriginalFocusOnly(next);
          }
        }
      }
    };

    _this._validateFocusedElement = function (element) {
      _this._tabster.focusable.setCurrentGroupper(element);
    };

    _this._tabster = tabster;
    _this._win = getWindow;
    _this._initTimer = getWindow().setTimeout(_this._init, 0);
    return _this;
  }

  FocusedElementState.prototype.dispose = function () {
    _super.prototype.dispose.call(this);

    var win = this._win();

    FocusedElementState.restoreFocus(win);

    if (this._initTimer) {
      win.clearTimeout(this._initTimer);
      this._initTimer = undefined;
    }

    win.document.removeEventListener('focusin', this._onFocusIn, true);
    win.document.removeEventListener('focusout', this._onFocusOut, true);
    win.document.removeEventListener('mousedown', this._onMouseDown, true);
    win.removeEventListener('keydown', this._onKeyDown, true);
    delete FocusedElementState._lastFocusedProgrammatically;
    delete FocusedElementState._lastResetElement;
    delete this._nextVal;
    delete this._lastVal;
  };

  FocusedElementState.dispose = function (instance) {
    instance.dispose();
  };

  FocusedElementState.forgetMemorized = function (instance, parent) {
    var _a, _b;

    var wel = FocusedElementState._lastFocusedProgrammatically;
    var el = wel && wel.get();

    if (el && parent.contains(el)) {
      delete FocusedElementState._lastFocusedProgrammatically;
    }

    wel = FocusedElementState._lastResetElement;
    el = wel && wel.get();

    if (el && parent.contains(el)) {
      delete FocusedElementState._lastResetElement;
    }

    el = (_b = (_a = instance._nextVal) === null || _a === void 0 ? void 0 : _a.element) === null || _b === void 0 ? void 0 : _b.get();

    if (el && parent.contains(el)) {
      delete instance._nextVal;
    }

    wel = instance._lastVal;
    el = wel && wel.get();

    if (el && parent.contains(el)) {
      delete instance._lastVal;
    }
  };

  FocusedElementState.prototype.getFocusedElement = function () {
    return this.getVal();
  };

  FocusedElementState.prototype.getLastFocusedElement = function () {
    var _a;

    var el = (_a = this._lastVal) === null || _a === void 0 ? void 0 : _a.get();

    if (!el || el && !documentContains(el.ownerDocument, el)) {
      this._lastVal = el = undefined;
    }

    return el;
  };

  FocusedElementState.prototype.focus = function (element, noFocusedProgrammaticallyFlag, noAccessibleCheck) {
    if (!this._tabster.focusable.isFocusable(element, noFocusedProgrammaticallyFlag, false, noAccessibleCheck)) {
      return false;
    }

    FocusedElementState._lastFocusedProgrammatically = new WeakHTMLElement(this._win, element);
    element.focus();
    return true;
  };

  FocusedElementState.prototype.focusDefault = function (container) {
    var el = this._tabster.focusable.findDefault(container);

    if (el) {
      this._tabster.focusedElement.focus(el);

      return true;
    }

    return false;
  };

  FocusedElementState.prototype.focusFirst = function (container) {
    var first = this._tabster.focusable.findFirst(container, false, true);

    if (first) {
      this.focus(first);
      return true;
    }

    return false;
  };

  FocusedElementState.prototype.resetFocus = function (container) {
    if (!this._tabster.focusable.isVisible(container)) {
      return false;
    }

    if (!this._tabster.focusable.isFocusable(container, true, true, true)) {
      var prevTabIndex = container.getAttribute('tabindex');
      var prevAriaHidden = container.getAttribute('aria-hidden');
      container.tabIndex = -1;
      container.setAttribute('aria-hidden', 'true');
      FocusedElementState._lastResetElement = new WeakHTMLElement(this._win, container);
      this.focus(container, true, true);

      this._setOrRemoveAttribute(container, 'tabindex', prevTabIndex);

      this._setOrRemoveAttribute(container, 'aria-hidden', prevAriaHidden);
    } else {
      this.focus(container);
    }

    return true;
  };

  FocusedElementState.prototype._setOrRemoveAttribute = function (element, name, value) {
    if (value === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  };

  FocusedElementState.prototype._setFocusedElement = function (element, relatedTarget) {
    var _a, _b;

    var details = {
      relatedTarget: relatedTarget
    };

    if (element) {
      var lastResetElement = (_a = FocusedElementState._lastResetElement) === null || _a === void 0 ? void 0 : _a.get();
      FocusedElementState._lastResetElement = undefined;

      if (lastResetElement === element || shouldIgnoreFocus(element)) {
        return;
      }

      if (this._canOverrideNativeFocus || FocusedElementState._lastFocusedProgrammatically) {
        details.isFocusedProgrammatically = element === ((_b = FocusedElementState._lastFocusedProgrammatically) === null || _b === void 0 ? void 0 : _b.get());
        FocusedElementState._lastFocusedProgrammatically = undefined;
      }
    }

    var nextVal = this._nextVal = {
      element: element ? new WeakHTMLElement(this._win, element) : undefined,
      details: details
    };

    if (element && element !== this._val) {
      this._validateFocusedElement(element);
    } // _validateFocusedElement() might cause the refocus which will trigger
    // another call to this function. Making sure that the value is correct.


    if (this._nextVal === nextVal) {
      this.setVal(element, details);
    }

    this._nextVal = undefined;
  };

  FocusedElementState.prototype.setVal = function (val, details) {
    _super.prototype.setVal.call(this, val, details);

    if (val) {
      this._lastVal = new WeakHTMLElement(this._win, val);
    }
  };

  FocusedElementState.replaceFocus = function (getWindow) {
    var win = getWindow();
    var origFocus = win.HTMLElement.prototype.focus;

    if (origFocus.__tabsterFocus) {
      // Already set up.
      return;
    }

    win.HTMLElement.prototype.focus = focus;

    function focus() {
      FocusedElementState._lastFocusedProgrammatically = new WeakHTMLElement(getWindow, this);
      return origFocus.apply(this, arguments);
    }

    focus.__tabsterFocus = origFocus;
  };

  FocusedElementState.restoreFocus = function (win) {
    var proto = win.HTMLElement.prototype;
    var origFocus = proto.focus.__tabsterFocus;

    if (origFocus) {
      proto.focus = origFocus;
    }
  };

  FocusedElementState.prototype._getFirstInGroupper = function (groupperElement, ignoreGroupper) {
    return this._tabster.focusable.isFocusable(groupperElement) ? groupperElement : this._tabster.focusable.findFirst(groupperElement, false, ignoreGroupper);
  };

  FocusedElementState.prototype._findNextGroupper = function (from, key, direction, isRtl) {
    if (direction === GroupperNextDirections.Vertical && (key === Keys.Left || key === Keys.Right)) {
      return null;
    }

    if (direction === GroupperNextDirections.Horizontal && (key === Keys.Up || key === Keys.Down)) {
      return null;
    }

    if (direction === undefined || direction === GroupperNextDirections.Both) {
      if (key === Keys.Left && !isRtl || key === Keys.Right && isRtl || key === Keys.Up) {
        return this._tabster.focusable.findPrevGroupper(from);
      } else {
        return this._tabster.focusable.findNextGroupper(from);
      }
    }

    var fromRect = from.getBoundingClientRect();
    var next;
    var lastEl;
    var prevTop;
    var nextMethod = key === Keys.Down || key === Keys.Right ? 'findNextGroupper' : 'findPrevGroupper';

    for (var el = this._tabster.focusable[nextMethod](from); el; el = this._tabster.focusable[nextMethod](el)) {
      var rect = el.getBoundingClientRect();

      if (key === Keys.Up) {
        if (rect.top < fromRect.top) {
          if (prevTop === undefined) {
            prevTop = rect.top;
          } else if (rect.top < prevTop) {
            break;
          }

          if (rect.left < fromRect.left) {
            if (!next) {
              next = el;
            }

            break;
          }

          next = el;
        }
      } else if (key === Keys.Down) {
        if (rect.top > fromRect.top) {
          if (prevTop === undefined) {
            prevTop = rect.top;
          } else if (rect.top > prevTop) {
            break;
          }

          if (rect.left > fromRect.left) {
            if (!next) {
              next = el;
            }

            break;
          }

          next = el;
        }
      } else if (key === Keys.Left || key === Keys.Right) {
        next = el;
        break;
      }

      lastEl = el;
    }

    return next || lastEl || null;
  };

  FocusedElementState.prototype._findPageUpGroupper = function (from) {
    var ue = this._tabster.focusable.findPrevGroupper(from);

    var pue = null;

    while (ue) {
      pue = ue;
      ue = isElementVerticallyVisibleInContainer(this._win, ue) ? this._tabster.focusable.findPrevGroupper(ue) : null;
    }

    return pue;
  };

  FocusedElementState.prototype._findPageDownGroupper = function (from) {
    var de = this._tabster.focusable.findNextGroupper(from);

    var pde = null;

    while (de) {
      pde = de;
      de = isElementVerticallyVisibleInContainer(this._win, de) ? this._tabster.focusable.findNextGroupper(de) : null;
    }

    return pde;
  };

  FocusedElementState.prototype._isInput = function (element) {
    return matchesSelector(element, _inputSelector);
  };

  return FocusedElementState;
}(Subscribable);

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var _lastInternalId = 0;

function _setInformativeStyle$2(weakElement, remove, internalId, userId, isActive, isFocused) {
  if (process.env.NODE_ENV !== "production") {
    var element = weakElement.get();

    if (element) {
      if (remove) {
        element.style.removeProperty('--tabster-modalizer');
      } else {
        element.style.setProperty('--tabster-modalizer', internalId + ',' + userId + ',' + (isActive ? 'active' : 'inactive') + ',' + ',' + (isFocused ? 'focused' : 'not-focused'));
      }
    }
  }
}

var Modalizer =
/*#__PURE__*/

/** @class */
function () {
  function Modalizer(element, tabster, win, basic, extended) {
    this._isFocused = false;
    this._tabster = tabster;
    this._win = win;
    this.internalId = 'ml' + ++_lastInternalId;
    this.userId = basic.id;
    this._modalizerRoot = new WeakHTMLElement(win, element);

    if (element.parentElement) {
      this._modalizerParent = new WeakHTMLElement(win, element.parentElement);
    } else {
      this._modalizerParent = null;
    }

    this._basic = basic;
    this._extended = extended || {};

    this._setAccessibilityProps();

    if (process.env.NODE_ENV !== "production") {
      _setInformativeStyle$2(this._modalizerRoot, false, this.internalId, this.userId, this._isActive, this._isFocused);
    }
  }

  Modalizer.prototype.setProps = function (basic, extended) {
    if (basic) {
      if (basic.id) {
        this.userId = basic.id;
      }

      this._basic = __assign(__assign({}, this._basic), basic);
    } else if (basic === null) {
      this._basic = {
        id: this.userId
      };
    }

    if (extended) {
      this._extended = __assign(__assign({}, this._extended), extended);
    } else if (extended === null) {
      this._extended = {};
    }

    this._setAccessibilityProps();
  };

  Modalizer.prototype.dispose = function () {
    if (this._isFocused) {
      this.setFocused(false);
    }

    this._remove();

    this._extended = {};
  };

  Modalizer.prototype.move = function (newElement) {
    this._remove();

    this._modalizerRoot = new WeakHTMLElement(this._win, newElement);

    if (newElement.parentElement) {
      this._modalizerParent = new WeakHTMLElement(this._win, newElement.parentElement);
    }

    this._setAccessibilityProps();

    this._isActive = !this._isActive;
    this.setActive(!this._isActive);
  };

  Modalizer.prototype.setActive = function (active) {
    var _this = this;

    var _a, _b, _c;

    if (active === this._isActive) {
      return;
    }

    this._isActive = active;

    if (process.env.NODE_ENV !== "production") {
      _setInformativeStyle$2(this._modalizerRoot, false, this.internalId, this.userId, this._isActive, this._isFocused);
    }

    var targetDocument = ((_a = this._modalizerRoot.get()) === null || _a === void 0 ? void 0 : _a.ownerDocument) || ((_c = (_b = this._modalizerParent) === null || _b === void 0 ? void 0 : _b.get()) === null || _c === void 0 ? void 0 : _c.ownerDocument); // Document can't be determined frm the modalizer root or its parent, fallback to window

    if (!targetDocument) {
      targetDocument = this._win().document;
    }

    var root = targetDocument.body; // Sets or restores aria-hidden value based on `active` flag

    var ariaHiddenWalker = createElementTreeWalker(targetDocument, root, function (el) {
      var _a; // if other content should be accessible no need to do walk the tree


      if (_this._basic.isOthersAccessible) {
        return NodeFilter.FILTER_REJECT;
      }

      var modalizerRoot = _this._modalizerRoot.get();

      var modalizerParent = (_a = _this._modalizerParent) === null || _a === void 0 ? void 0 : _a.get();
      var isModalizerElement = modalizerRoot === el;
      var containsModalizerRoot = !!el.contains(modalizerRoot || null);
      var containsModalizerParent = !!el.contains(modalizerParent || null);

      if (isModalizerElement) {
        return NodeFilter.FILTER_REJECT;
      }

      if (containsModalizerRoot || containsModalizerParent) {
        return NodeFilter.FILTER_SKIP;
      } // Add `aria-hidden` when modalizer is active
      // Restore `aria-hidden` when modalizer is inactive


      augmentAttribute(_this._tabster, el, 'aria-hidden', active ? 'true' : undefined);
      var modalizerRootOnPage = modalizerRoot === (modalizerRoot === null || modalizerRoot === void 0 ? void 0 : modalizerRoot.ownerDocument.body) ? false : modalizerRoot === null || modalizerRoot === void 0 ? void 0 : modalizerRoot.ownerDocument.body.contains(modalizerRoot);
      var modalizerParentOnPage = modalizerParent === (modalizerParent === null || modalizerParent === void 0 ? void 0 : modalizerParent.ownerDocument.body) ? false : modalizerParent === null || modalizerParent === void 0 ? void 0 : modalizerParent.ownerDocument.body.contains(modalizerParent); // if the modalizer root or its parent is not on the page, all nodes need to be visited

      if (!modalizerParentOnPage && !modalizerRootOnPage) {
        return NodeFilter.FILTER_SKIP;
      }

      return NodeFilter.FILTER_REJECT;
    });

    if (ariaHiddenWalker) {
      while (ariaHiddenWalker.nextNode()) {
        /** Iterate to update the tree */
      }
    }
  };

  Modalizer.prototype.isActive = function () {
    return !!this._isActive;
  };

  Modalizer.prototype.getModalizerRoot = function () {
    return this._modalizerRoot.get();
  };

  Modalizer.prototype.contains = function (element) {
    var _a;

    return !!((_a = this.getModalizerRoot()) === null || _a === void 0 ? void 0 : _a.contains(element));
  };

  Modalizer.prototype.setFocused = function (focused) {
    if (this._isFocused === focused) {
      return;
    }

    this._isFocused = focused;

    if (focused) {
      if (this._extended.onFocusIn) {
        this._extended.onFocusIn();
      }
    } else {
      if (this._extended.onFocusOut) {
        this._extended.onFocusOut(false);
      }
    }

    if (process.env.NODE_ENV !== "production") {
      _setInformativeStyle$2(this._modalizerRoot, false, this.internalId, this.userId, this._isActive, this._isFocused);
    }
  };

  Modalizer.prototype.onBeforeFocusOut = function () {
    if (this._extended.onFocusOut) {
      return this._extended.onFocusOut(true);
    }

    return false;
  };

  Modalizer.prototype.getBasicProps = function () {
    return this._basic;
  };

  Modalizer.prototype.getExtendedProps = function () {
    return this._extended;
  };

  Modalizer.prototype._remove = function () {
    if (process.env.NODE_ENV !== "production") {
      _setInformativeStyle$2(this._modalizerRoot, true);
    }
  };

  Modalizer.prototype._setAccessibilityProps = function () {
    var _a;

    if (process.env.NODE_ENV !== "production") {
      if (!((_a = this._modalizerRoot.get()) === null || _a === void 0 ? void 0 : _a.getAttribute('aria-label'))) {
        console.error('Modalizer element must have aria-label', this._modalizerRoot.get());
      }
    }
  };

  return Modalizer;
}();

var ModalizerAPI =
/*#__PURE__*/

/** @class */
function () {
  function ModalizerAPI(tabster) {
    var _this = this;

    this._init = function () {
      _this._initTimer = undefined;

      _this._tabster.focusedElement.subscribe(_this._onFocus);

      _this._win().document.addEventListener(MUTATION_EVENT_NAME, _this._onMutation);
    };
    /**
     * Listens to DOM mutation events for removed modalizers
     */


    this._onMutation = function (e) {
      var _a;

      var details = e.details;

      if (!((_a = details.modalizer) === null || _a === void 0 ? void 0 : _a.isActive()) || !details.removed) {
        return;
      } // If an active modalizer is no longer on DOM, remove it


      if (details.modalizer.isActive()) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Modalizer: " + details.modalizer.userId + ".\n                    calling ModalizerAPI.remove(element) before removing a modalizer from DOM can be safer.\n                ");
        }

        delete _this._modalizers[details.modalizer.userId];

        if (_this._curModalizer === details.modalizer) {
          _this._curModalizer = undefined;
        }

        details.modalizer.setFocused(false);
        details.modalizer.setActive(false);
        details.modalizer.dispose();
      }
    };
    /**
     * Subscribes to the focus state and handles modalizer related focus events
     * @param e - Element that is focused
     * @param details - Additional data about the focus event
     */


    this._onFocus = function (focusedElement, details) {
      var _a, _b;

      var ctx = focusedElement && RootAPI.getTabsterContext(_this._tabster, focusedElement); // Modalizer behaviour is opt in, only apply to elements that have a tabster context

      if (!ctx) {
        return;
      }

      if (_this._focusOutTimer) {
        _this._win().clearTimeout(_this._focusOutTimer);

        _this._focusOutTimer = undefined;
      }

      var modalizer = ctx === null || ctx === void 0 ? void 0 : ctx.modalizer;

      if (modalizer === _this._curModalizer) {
        return;
      }

      (_a = _this._curModalizer) === null || _a === void 0 ? void 0 : _a.setFocused(false); // Developers calling `element.focus()` should change/deactivate active modalizer 

      if (details.isFocusedProgrammatically) {
        (_b = _this._curModalizer) === null || _b === void 0 ? void 0 : _b.setActive(false);
        _this._curModalizer = undefined;

        if (modalizer) {
          _this._curModalizer = modalizer;

          _this._curModalizer.setActive(true);

          _this._curModalizer.setFocused(true);
        }
      } else if (focusedElement && _this._curModalizer && !_this._curModalizer.getBasicProps().isOthersAccessible) {
        // Focused outside of the active modalizer, try pull focus back to current modalizer
        _this._restoreModalizerFocus(focusedElement);
      }
    };

    this._tabster = tabster;
    this._win = tabster.getWindow;
    this._initTimer = this._win().setTimeout(this._init, 0);
    this._modalizers = {};
  }

  ModalizerAPI.prototype.dispose = function () {
    var _this = this;

    var win = this._win();

    if (this._initTimer) {
      win.clearTimeout(this._initTimer);
      this._initTimer = undefined;
    }

    if (this._focusOutTimer) {
      win.clearTimeout(this._focusOutTimer);
      this._focusOutTimer = undefined;
    } // Dispose all modalizers managed by the API


    Object.keys(this._modalizers).forEach(function (modalizerId) {
      if (_this._modalizers[modalizerId]) {
        _this._modalizers[modalizerId].dispose();

        delete _this._modalizers[modalizerId];
      }
    });

    this._tabster.focusedElement.unsubscribe(this._onFocus);

    delete this._curModalizer;
  };

  ModalizerAPI.dispose = function (instance) {
    instance.dispose();
  };

  ModalizerAPI.prototype.add = function (element, basic, extended) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);

    if (tabsterOnElement && tabsterOnElement.modalizer) {
      if (process.env.NODE_ENV !== "production" && tabsterOnElement.modalizer.userId !== basic.id) {
        console.error('Element already has Modalizer with different id.', element);
      }

      return;
    }

    if (!this._modalizers[basic.id]) {
      var modalizer = new Modalizer(element, this._tabster, this._win, basic, extended);
      this._modalizers[basic.id] = modalizer;
    } else if (process.env.NODE_ENV !== "production") {
      var err = new Error("Attempted to add Modalizer: " + basic.id + " which already exists");
      console.error(err.stack);
    }

    setTabsterOnElement(this._tabster, element, {
      modalizer: this._modalizers[basic.id]
    });
    dispatchMutationEvent(element, {
      modalizer: this._modalizers[basic.id]
    });
  };

  ModalizerAPI.prototype.setProps = function (element, basic, extended) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);

    if (tabsterOnElement && tabsterOnElement.modalizer) {
      tabsterOnElement.modalizer.setProps(basic, extended);
    }
  };

  ModalizerAPI.prototype.remove = function (element) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);
    var modalizer = tabsterOnElement && tabsterOnElement.modalizer;

    if (!modalizer) {
      if (process.env.NODE_ENV !== "production") {
        console.error('No Modalizer to remove.', element);
      }

      return;
    }

    setTabsterOnElement(this._tabster, element, {
      modalizer: undefined
    });
    modalizer.setActive(false);

    if (this._curModalizer === modalizer) {
      this._curModalizer = undefined;
    }

    delete this._modalizers[modalizer.userId];
    modalizer.dispose();
  };

  ModalizerAPI.prototype.move = function (from, to) {
    var tabsterOnElementFrom = getTabsterOnElement(this._tabster, from);
    var modalizer = tabsterOnElementFrom && tabsterOnElementFrom.modalizer;

    if (modalizer) {
      modalizer.move(to);
      setTabsterOnElement(this._tabster, to, {
        modalizer: modalizer
      });
      setTabsterOnElement(this._tabster, from, {
        modalizer: undefined
      });
      dispatchMutationEvent(from, {
        modalizer: modalizer,
        removed: true
      });
      dispatchMutationEvent(to, {
        modalizer: modalizer
      });
    }
  };

  ModalizerAPI.prototype.focus = function (elementFromModalizer, noFocusFirst, noFocusDefault) {
    var ctx = RootAPI.getTabsterContext(this._tabster, elementFromModalizer);

    if (ctx && ctx.modalizer) {
      this._curModalizer = ctx.modalizer;

      this._curModalizer.setActive(true);

      var basic = this._curModalizer.getBasicProps();

      var modalizerRoot = this._curModalizer.getModalizerRoot();

      if (modalizerRoot) {
        if (noFocusFirst === undefined) {
          noFocusFirst = basic.isNoFocusFirst;
        }

        if (!noFocusFirst && this._tabster.keyboardNavigation.isNavigatingWithKeyboard() && this._tabster.focusedElement.focusFirst(modalizerRoot)) {
          return true;
        }

        if (noFocusDefault === undefined) {
          noFocusDefault = basic.isNoFocusDefault;
        }

        if (!noFocusDefault && this._tabster.focusedElement.focusDefault(modalizerRoot)) {
          return true;
        }

        this._tabster.focusedElement.resetFocus(modalizerRoot);
      }
    } else if (process.env.NODE_ENV !== "production") {
      console.error('Element is not in Modalizer.', elementFromModalizer);
    }

    return false;
  };

  ModalizerAPI.prototype.getActiveModalizer = function () {
    return this._curModalizer;
  };
  /**
   * Called when an element is focused outside of an active modalizer.
   * Attempts to pull focus back into the active modalizer
   * @param outsideElement - An element being focused outside of the modalizer
   */


  ModalizerAPI.prototype._restoreModalizerFocus = function (outsideElement) {
    if (!(outsideElement === null || outsideElement === void 0 ? void 0 : outsideElement.ownerDocument) || !this._curModalizer) {
      return;
    }

    var toFocus = this._tabster.focusable.findFirst(this._curModalizer.getModalizerRoot());

    if (toFocus) {
      if (outsideElement.compareDocumentPosition(toFocus) & document.DOCUMENT_POSITION_PRECEDING) {
        toFocus = this._tabster.focusable.findLast(outsideElement.ownerDocument.body);

        if (!toFocus) {
          // This only might mean that findFirst/findLast are buggy and inconsistent.
          throw new Error('Something went wrong.');
        }
      }

      this._tabster.focusedElement.focus(toFocus);
    } else {
      // Current Modalizer doesn't seem to have focusable elements.
      // Blurring the currently focused element which is outside of the current Modalizer.
      outsideElement.blur();
    }
  };

  return ModalizerAPI;
}();

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

var ObservedElementAPI =
/*#__PURE__*/

/** @class */
function (_super) {
  __extends(ObservedElementAPI, _super);

  function ObservedElementAPI(tabster) {
    var _this = _super.call(this) || this;

    _this._waiting = {};
    _this._lastRequestFocusId = 0;
    _this._observedById = {};
    _this._observedByName = {};

    _this._init = function () {
      _this._initTimer = undefined;

      _this._win().document.addEventListener(MUTATION_EVENT_NAME, _this._onMutation, true); // Capture!

    };

    _this._onMutation = function (e) {
      if (!e.target || !e.details.observed) {
        return;
      }

      _this._onObservedElementUpdate(e.details.observed);
    };

    _this._tabster = tabster;
    _this._win = tabster.getWindow;
    _this._initTimer = _this._win().setTimeout(_this._init, 0);
    return _this;
  }

  ObservedElementAPI.prototype.dispose = function () {
    var win = this._win();

    if (this._initTimer) {
      win.clearTimeout(this._initTimer);
      this._initTimer = undefined;
    }

    win.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation, true); // Capture!

    for (var _i = 0, _a = Object.keys(this._waiting); _i < _a.length; _i++) {
      var name_1 = _a[_i];
      var w = this._waiting[name_1];

      if (w.timer) {
        win.clearTimeout(w.timer);
      }

      if (w.reject) {
        w.reject();
      }

      delete this._waiting[name_1];
    }

    this._observedById = {};
    this._observedByName = {};
  };

  ObservedElementAPI.dispose = function (instance) {
    instance.dispose();
  };

  ObservedElementAPI.prototype.add = function (element, basic, extended) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);

    if (tabsterOnElement && tabsterOnElement.observed) {
      if (process.env.NODE_ENV !== "production") {
        console.error('Element is already observed.', element);
      }

      return;
    }

    setTabsterOnElement(this._tabster, element, {
      observed: __assign(__assign({}, basic), extended)
    });

    this._onObservedElementUpdate(element);
  };

  ObservedElementAPI.prototype.remove = function (element) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);

    if (!tabsterOnElement || !tabsterOnElement.observed) {
      if (process.env.NODE_ENV !== "production") {
        console.error('Element is not observed.', element);
      }

      return;
    }

    setTabsterOnElement(this._tabster, element, {
      observed: undefined
    });

    this._onObservedElementUpdate(element);
  };

  ObservedElementAPI.prototype.move = function (from, to) {
    var tabsterOnElementFrom = getTabsterOnElement(this._tabster, from);
    var tabsterOnElementTo = getTabsterOnElement(this._tabster, to);
    var observed = tabsterOnElementFrom && tabsterOnElementFrom.observed;

    if (observed) {
      setTabsterOnElement(this._tabster, from, {
        observed: undefined
      });

      this._onObservedElementUpdate(from);

      if (tabsterOnElementTo && tabsterOnElementTo.observed) {
        if (process.env.NODE_ENV !== "production") {
          console.error('Element is already observed', to);
        }

        return;
      }

      setTabsterOnElement(this._tabster, to, {
        observed: observed
      });

      this._onObservedElementUpdate(to);
    } else if (process.env.NODE_ENV !== "production") {
      console.error('Element is not observed.', from);
    }
  };

  ObservedElementAPI.prototype.setProps = function (element, basic, extended) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);
    var observed = tabsterOnElement && tabsterOnElement.observed;

    if (!observed) {
      if (process.env.NODE_ENV !== "production") {
        console.error('Element is not observed.', element);
      }

      return;
    }

    setTabsterOnElement(this._tabster, element, {
      observed: __assign(__assign(__assign({}, observed), basic), extended)
    });

    this._onObservedElementUpdate(element);
  };

  ObservedElementAPI.prototype.getElement = function (observedName) {
    var o = this._observedByName[observedName];

    if (o) {
      for (var _i = 0, _a = Object.keys(o); _i < _a.length; _i++) {
        var uid = _a[_i];
        var el = o[uid].element.get() || null;

        if (!el) {
          delete o[uid];
          delete this._observedById[uid];
        }

        return el;
      }
    }

    return null;
  };

  ObservedElementAPI.prototype.waitElement = function (observedName, timeout) {
    var _this = this;

    var el = this.getElement(observedName);

    if (el) {
      return getPromise(this._win).resolve(el);
    }

    var w = this._waiting[observedName];

    if (w && w.promise) {
      return w.promise;
    }

    w = this._waiting[observedName] = {
      timer: this._win().setTimeout(function () {
        w.timer = undefined;
        delete _this._waiting[observedName];

        if (w.resolve) {
          w.resolve(null);
        }
      }, timeout)
    };
    var promise = new (getPromise(this._win))(function (resolve, reject) {
      w.resolve = resolve;
      w.reject = reject;
    });
    w.promise = promise;
    return promise;
  };

  ObservedElementAPI.prototype.requestFocus = function (observedName, timeout) {
    return __awaiter(this, void 0, void 0, function () {
      var requestId;

      var _this = this;

      return __generator(this, function (_a) {
        requestId = ++this._lastRequestFocusId;
        return [2
        /*return*/
        , this.waitElement(observedName, timeout).then(function (element) {
          return _this._lastRequestFocusId === requestId && element ? _this._tabster.focusedElement.focus(element) : false;
        })];
      });
    });
  };

  ObservedElementAPI.prototype._onObservedElementUpdate = function (element) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);
    var observed = tabsterOnElement && tabsterOnElement.observed;
    var uid = getElementUId(this._win, element);
    var isInDocument = documentContains(element.ownerDocument, element);
    var info = this._observedById[uid];

    if (observed && isInDocument) {
      if (!info) {
        info = this._observedById[uid] = {
          element: new WeakHTMLElement(this._win, element)
        };
      }

      if (observed.name && observed.name !== info.triggeredName) {
        if (info.triggeredName) {
          var obn_1 = this._observedByName[info.triggeredName];

          if (obn_1 && obn_1[uid]) {
            if (Object.keys(obn_1).length > 1) {
              delete obn_1[uid];
            } else {
              delete this._observedByName[info.triggeredName];
            }
          }
        }

        info.triggeredName = observed.name;
        var obn = this._observedByName[info.triggeredName];

        if (!obn) {
          obn = this._observedByName[info.triggeredName] = {};
        }

        obn[uid] = info;

        this._trigger(element, {
          name: observed.name,
          details: observed.details
        });
      }
    } else if (info) {
      if (info.triggeredName) {
        var obn = this._observedByName[info.triggeredName];

        if (obn && obn[uid]) {
          if (Object.keys(obn).length > 1) {
            delete obn[uid];
          } else {
            delete this._observedByName[info.triggeredName];
          }
        }
      }

      delete this._observedById[uid];
    }
  };

  ObservedElementAPI.prototype._trigger = function (val, details) {
    this.trigger(val, details);
    var name = details.name;
    var w = name && this._waiting[name];

    if (w) {
      if (w.timer) {
        this._win().clearTimeout(w.timer);
      }

      delete this._waiting[name];

      if (w.resolve) {
        w.resolve(val);
      }
    }
  };

  return ObservedElementAPI;
}(Subscribable);

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var defaultProps = {
  areaClass: 'tabster-focus-outline-area',
  outlineClass: 'tabster-focus-outline',
  outlineColor: '#ff4500',
  outlineWidth: 2,
  zIndex: 2147483647
};
var _props = defaultProps;

var _fullScreenEventName;

var _fullScreenElementName;

if (typeof document !== 'undefined') {
  if ('onfullscreenchange' in document) {
    _fullScreenEventName = 'fullscreenchange';
    _fullScreenElementName = 'fullscreenElement';
  } else if ('onwebkitfullscreenchange' in document) {
    _fullScreenEventName = 'webkitfullscreenchange';
    _fullScreenElementName = 'webkitFullscreenElement';
  } else if ('onmozfullscreenchange' in document) {
    _fullScreenEventName = 'mozfullscreenchange';
    _fullScreenElementName = 'mozFullScreenElement';
  } else if ('onmsfullscreenchange' in document) {
    _fullScreenEventName = 'msfullscreenchange';
    _fullScreenElementName = 'msFullscreenElement';
  }
}

var OutlinePosition =
/*#__PURE__*/

/** @class */
function () {
  function OutlinePosition(left, top, right, bottom) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }

  OutlinePosition.prototype.equalsTo = function (other) {
    return this.left === other.left && this.top === other.top && this.right === other.right && this.bottom === other.bottom;
  };

  OutlinePosition.prototype.clone = function () {
    return new OutlinePosition(this.left, this.top, this.right, this.bottom);
  };

  return OutlinePosition;
}();

var OutlineAPI =
/*#__PURE__*/

/** @class */
function () {
  function OutlineAPI(tabster) {
    var _this = this;

    this._isVisible = false;
    this._allOutlineElements = [];

    this._init = function () {
      _this._initTimer = undefined;

      _this._tabster.keyboardNavigation.subscribe(_this._onKeyboardNavigationStateChanged);

      _this._tabster.focusedElement.subscribe(_this._onFocus);

      var win = _this._win();

      win.addEventListener('scroll', _this._onScroll, true); // Capture!

      if (_fullScreenEventName) {
        win.document.addEventListener(_fullScreenEventName, _this._onFullScreenChanged);
      }
    };

    this._onFullScreenChanged = function (e) {
      if (!_fullScreenElementName || !e.target) {
        return;
      }

      var target = e.target.body || e.target;

      var outlineElements = _this._getDOM(target);

      if (target.ownerDocument && outlineElements) {
        var fsElement = target.ownerDocument[_fullScreenElementName];

        if (fsElement) {
          fsElement.appendChild(outlineElements.container);
          _this._fullScreenElement = fsElement;
        } else {
          target.ownerDocument.body.appendChild(outlineElements.container);
          _this._fullScreenElement = undefined;
        }
      }
    };

    this._onKeyboardNavigationStateChanged = function () {
      _this._onFocus(_this._tabster.focusedElement.getFocusedElement());
    };

    this._onFocus = function (e) {
      if (!_this._updateElement(e) && _this._isVisible) {
        _this._setVisibility(false);
      }
    };

    this._onScroll = function (e) {
      if (!_this._outlinedElement || !OutlineAPI._isParentChild(e.target, _this._outlinedElement)) {
        return;
      }

      _this._curPos = undefined;

      _this._setOutlinePosition();
    };

    this._tabster = tabster;
    this._win = tabster.getWindow;

    this._win().setTimeout(this._init, 0);
  }

  OutlineAPI.prototype.setup = function (props) {
    _props = __assign(__assign({}, _props), props);

    var win = this._win();

    if (!win.__tabsterOutline) {
      win.__tabsterOutline = {};
    }

    if (!win.__tabsterOutline.style) {
      win.__tabsterOutline.style = appendStyles(win.document, _props);
    }

    if (!props || !props.areaClass) {
      win.document.body.classList.add(defaultProps.areaClass);
    } else {
      win.document.body.classList.remove(defaultProps.areaClass);
    }
  };

  OutlineAPI.prototype.setProps = function (element, props) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);
    var curProps = tabsterOnElement && tabsterOnElement.outline || {};
    var newProps = {};

    if (props) {
      for (var _i = 0, _a = Object.keys(props); _i < _a.length; _i++) {
        var key = _a[_i];
        var prop = props[key];

        if (prop) {
          newProps[key] = prop;
        } else if (prop === undefined && curProps[key]) {
          newProps[key] = curProps[key];
        }
      }
    }

    if (newProps.isIgnored !== curProps.isIgnored) {
      setTabsterOnElement(this._tabster, element, {
        outline: newProps
      });
    }
  };

  OutlineAPI.prototype.dispose = function () {
    var _this = this;

    var win = this._win();

    if (this._initTimer) {
      win.clearTimeout(this._initTimer);
      this._initTimer = undefined;
    }

    if (this._updateTimer) {
      win.clearTimeout(this._updateTimer);
      this._updateTimer = undefined;
    }

    this._tabster.keyboardNavigation.unsubscribe(this._onKeyboardNavigationStateChanged);

    this._tabster.focusedElement.unsubscribe(this._onFocus);

    win.removeEventListener('scroll', this._onScroll, true);

    if (_fullScreenEventName) {
      win.document.removeEventListener(_fullScreenEventName, this._onFullScreenChanged);
    }

    this._allOutlineElements.forEach(function (outlineElements) {
      return _this._removeDOM(outlineElements.container);
    });

    this._allOutlineElements = [];
    delete this._outlinedElement;
    delete this._curPos;
    delete this._curOutlineElements;
    delete this._fullScreenElement;
  };

  OutlineAPI.dispose = function (instance) {
    instance.dispose();
  };

  OutlineAPI.prototype._shouldShowCustomOutline = function (element) {
    var tabsterOnElement = getTabsterOnElement(this._tabster, element);

    if (tabsterOnElement && tabsterOnElement.outline && tabsterOnElement.outline.isIgnored) {
      return false;
    }

    for (var i = element; i; i = i.parentElement) {
      if (i.classList && i.classList.contains(_props.areaClass)) {
        return true;
      }
    }

    return false;
  };

  OutlineAPI.prototype._updateElement = function (e) {
    this._outlinedElement = undefined;

    if (this._updateTimer) {
      this._win().clearTimeout(this._updateTimer);

      this._updateTimer = undefined;
    }

    this._curPos = undefined;

    if (!this._tabster.keyboardNavigation.isNavigatingWithKeyboard()) {
      return false;
    }

    if (e) {
      // TODO: It's hard (and not necessary) to come up with every possible
      // condition when there should be no outline, it's better to add an
      // API to customize the ignores.
      if (e.tagName === 'INPUT') {
        var inputType = e.type;
        var outlinedInputTypes = {
          button: true,
          checkbox: true,
          file: true,
          image: true,
          radio: true,
          range: true,
          reset: true,
          submit: true
        };

        if (!(inputType in outlinedInputTypes)) {
          return false;
        }
      } else if (e.tagName === 'TEXTAREA' || e.contentEditable === 'true' || e.tagName === 'IFRAME') {
        return false;
      }

      if (!this._shouldShowCustomOutline(e)) {
        return false;
      }

      if (this._tabster.keyboardNavigation.isNavigatingWithKeyboard()) {
        this._outlinedElement = e;

        this._updateOutline();
      }

      return true;
    }

    return false;
  };

  OutlineAPI.prototype._updateOutline = function () {
    var _this = this;

    this._setOutlinePosition();

    if (this._updateTimer) {
      this._win().clearTimeout(this._updateTimer);

      this._updateTimer = undefined;
    }

    if (!this._outlinedElement) {
      return;
    }

    this._updateTimer = this._win().setTimeout(function () {
      _this._updateTimer = undefined;

      _this._updateOutline();
    }, 30);
  };

  OutlineAPI.prototype._setVisibility = function (visible) {
    this._isVisible = visible;

    if (this._curOutlineElements) {
      if (visible) {
        this._curOutlineElements.container.classList.add(_props.outlineClass + "_visible");
      } else {
        this._curOutlineElements.container.classList.remove(_props.outlineClass + "_visible");

        this._curPos = undefined;
      }
    }
  };

  OutlineAPI.prototype._setOutlinePosition = function () {
    if (!this._outlinedElement) {
      return;
    }

    var boundingRect = getBoundingRect(this._win, this._outlinedElement);
    var position = new OutlinePosition(boundingRect.left, boundingRect.top, boundingRect.right, boundingRect.bottom);

    if (this._curPos && position.equalsTo(this._curPos)) {
      return;
    }

    var outlineElements = this._getDOM(this._outlinedElement);

    var win = this._outlinedElement.ownerDocument && this._outlinedElement.ownerDocument.defaultView;

    if (!outlineElements || !win) {
      return;
    }

    if (this._curOutlineElements !== outlineElements) {
      this._setVisibility(false);

      this._curOutlineElements = outlineElements;
    }

    this._curPos = position;
    var p = position.clone();
    var hasAbsolutePositionedParent = false;
    var hasFixedPositionedParent = false;
    var container = outlineElements.container;
    var scrollingElement = container && container.ownerDocument && container.ownerDocument.scrollingElement;

    if (!scrollingElement) {
      return;
    }

    for (var parent_1 = this._outlinedElement.parentElement; parent_1; parent_1 = parent_1.parentElement) {
      // The element might be partially visible within its scrollable parent,
      // reduce the bounding rect if this is the case.
      if (parent_1 === this._fullScreenElement) {
        break;
      }

      boundingRect = getBoundingRect(this._win, parent_1);
      var win_1 = parent_1.ownerDocument && parent_1.ownerDocument.defaultView;

      if (!win_1) {
        return;
      }

      var computedStyle = win_1.getComputedStyle(parent_1);
      var position_1 = computedStyle.position;

      if (position_1 === 'absolute') {
        hasAbsolutePositionedParent = true;
      } else if (position_1 === 'fixed' || position_1 === 'sticky') {
        hasFixedPositionedParent = true;
      }

      if (computedStyle.overflow === 'visible') {
        continue;
      }

      if (!hasAbsolutePositionedParent && !hasFixedPositionedParent || computedStyle.overflow === 'hidden') {
        if (boundingRect.left > p.left) {
          p.left = boundingRect.left;
        }

        if (boundingRect.top > p.top) {
          p.top = boundingRect.top;
        }

        if (boundingRect.right < p.right) {
          p.right = boundingRect.right;
        }

        if (boundingRect.bottom < p.bottom) {
          p.bottom = boundingRect.bottom;
        }
      }
    }

    var allRect = getBoundingRect(this._win, scrollingElement);
    var allWidth = allRect.left + allRect.right;
    var allHeight = allRect.top + allRect.bottom;
    var ow = _props.outlineWidth;
    p.left = p.left > ow ? p.left - ow : 0;
    p.top = p.top > ow ? p.top - ow : 0;
    p.right = p.right < allWidth - ow ? p.right + ow : allWidth;
    p.bottom = p.bottom < allHeight - ow ? p.bottom + ow : allHeight;
    var width = p.right - p.left;
    var height = p.bottom - p.top;

    if (width > ow * 2 && height > ow * 2) {
      var leftBorderNode = outlineElements.left;
      var topBorderNode = outlineElements.top;
      var rightBorderNode = outlineElements.right;
      var bottomBorderNode = outlineElements.bottom;
      var sx = this._fullScreenElement || hasFixedPositionedParent ? 0 : win.pageXOffset;
      var sy = this._fullScreenElement || hasFixedPositionedParent ? 0 : win.pageYOffset;
      container.style.position = hasFixedPositionedParent ? 'fixed' : 'absolute';
      container.style.background = _props.outlineColor;
      leftBorderNode.style.width = rightBorderNode.style.width = topBorderNode.style.height = bottomBorderNode.style.height = _props.outlineWidth + 'px';
      leftBorderNode.style.left = topBorderNode.style.left = bottomBorderNode.style.left = p.left + sx + 'px';
      rightBorderNode.style.left = p.left + sx + width - ow + 'px';
      leftBorderNode.style.top = rightBorderNode.style.top = topBorderNode.style.top = p.top + sy + 'px';
      bottomBorderNode.style.top = p.top + sy + height - ow + 'px';
      leftBorderNode.style.height = rightBorderNode.style.height = height + 'px';
      topBorderNode.style.width = bottomBorderNode.style.width = width + 'px';

      this._setVisibility(true);
    } else {
      this._setVisibility(false);
    }
  };

  OutlineAPI.prototype._getDOM = function (contextElement) {
    var doc = contextElement.ownerDocument;
    var win = doc && doc.defaultView;

    if (!doc || !win || !win.__tabsterOutline) {
      return undefined;
    }

    if (!win.__tabsterOutline.style) {
      win.__tabsterOutline.style = appendStyles(doc, _props);
    }

    if (!win.__tabsterOutline.elements) {
      var outlineElements = {
        container: doc.createElement('div'),
        left: doc.createElement('div'),
        top: doc.createElement('div'),
        right: doc.createElement('div'),
        bottom: doc.createElement('div')
      };
      outlineElements.container.className = _props.outlineClass;
      outlineElements.left.className = _props.outlineClass + "__left";
      outlineElements.top.className = _props.outlineClass + "__top";
      outlineElements.right.className = _props.outlineClass + "__right";
      outlineElements.bottom.className = _props.outlineClass + "__bottom";
      outlineElements.container.appendChild(outlineElements.left);
      outlineElements.container.appendChild(outlineElements.top);
      outlineElements.container.appendChild(outlineElements.right);
      outlineElements.container.appendChild(outlineElements.bottom);
      doc.body.appendChild(outlineElements.container);
      win.__tabsterOutline.elements = outlineElements; // TODO: Make a garbage collector to remove the references
      // to the outlines which are nowhere in the DOM anymore.

      this._allOutlineElements.push(outlineElements);
    }

    return win.__tabsterOutline.elements;
  };

  OutlineAPI.prototype._removeDOM = function (contextElement) {
    var win = contextElement.ownerDocument && contextElement.ownerDocument.defaultView;
    var outline = win && win.__tabsterOutline;

    if (!outline) {
      return;
    }

    if (outline.style && outline.style.parentNode) {
      outline.style.parentNode.removeChild(outline.style);
      delete outline.style;
    }

    var outlineElements = outline && outline.elements;

    if (outlineElements) {
      if (outlineElements.container.parentNode) {
        outlineElements.container.parentNode.removeChild(outlineElements.container);
      }

      delete outline.elements;
    }
  };

  OutlineAPI._isParentChild = function (parent, child) {
    return child === parent || // tslint:disable-next-line:no-bitwise
    !!(parent.compareDocumentPosition(child) & document.DOCUMENT_POSITION_CONTAINED_BY);
  };

  return OutlineAPI;
}();

function appendStyles(document, props) {
  var style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(getOutlineStyles(props)));
  document.head.appendChild(style);
  return style;
}

function getOutlineStyles(props) {
  return "\n." + props.areaClass + " *, ." + props.areaClass + " *:focus {\noutline: none !important;\n}\n\n." + props.outlineClass + " {\ndisplay: none;\nposition: absolute;\nwidth: 0;\nheight: 0;\nleft: 0;\ntop: 0;\nz-index: " + props.zIndex + ";\n}\n\n." + props.outlineClass + "." + props.outlineClass + "_visible {\ndisplay: block;\n}\n\n." + props.outlineClass + "__left,\n." + props.outlineClass + "__top,\n." + props.outlineClass + "__right,\n." + props.outlineClass + "__bottom {\nposition: absolute;\nbackground: inherit;\n}";
}

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Extends Window to include an internal Tabster instance.
 */

var Tabster =
/*#__PURE__*/

/** @class */
function () {
  function Tabster(win, props) {
    var _this = this;

    this._forgetMemorizedElements = [];

    this.getWindow = function () {
      if (!_this._win) {
        throw new Error('Using disposed Tabster.');
      }

      return _this._win;
    };

    this._storage = {};
    this._win = win;
    var getWindow = this.getWindow;

    if (win && win.document) {
      this._unobserve = observeMutations(win.document, this, updateTabsterByAttribute);
    }

    this.keyboardNavigation = new KeyboardNavigationState(this, getWindow);
    this.focusedElement = new FocusedElementState(this, getWindow);
    this.focusable = new FocusableAPI(this, getWindow);
    this.root = new RootAPI(this, function () {
      FocusableAPI.forgetFocusedGrouppers(_this.focusable);
    }, props === null || props === void 0 ? void 0 : props.autoRoot);
    startWeakRefStorageCleanup(getWindow);
  }

  Tabster.prototype.dispose = function () {
    var _a, _b;

    if (this._unobserve) {
      this._unobserve();

      delete this._unobserve;
    }

    this._forgetMemorizedElements = [];

    if (this._win && this._forgetMemorizedTimer) {
      this._win.clearTimeout(this._forgetMemorizedTimer);

      delete this._forgetMemorizedTimer;
    }

    if (this.outlineDispose) {
      this.outlineDispose();
      delete this.outline;
      delete this.outlineDispose;
    }

    if (this.crossOriginDispose) {
      this.crossOriginDispose();
      delete this.crossOrigin;
      delete this.crossOriginDispose;
    }

    if (this.deloserDispose) {
      this.deloserDispose();
      delete this.deloser;
      delete this.deloserDispose;
    }

    if (this.modalizerDispose) {
      this.modalizerDispose();
      delete this.modalizer;
      delete this.modalizerDispose;
    }

    if (this.observedElementDispose) {
      this.observedElementDispose();
      delete this.observedElement;
      delete this.observedElementDispose;
    }

    KeyboardNavigationState.dispose(this.keyboardNavigation);
    FocusableAPI.dispose(this.focusable);
    FocusedElementState.dispose(this.focusedElement);
    RootAPI.dispose(this.root);
    stopWeakRefStorageCleanupAndClearStorage(this.getWindow);
    clearElementCache(this.getWindow);
    this._storage = {};

    if ((_a = this._win) === null || _a === void 0 ? void 0 : _a.__tabsterInstance) {
      (_b = this._win) === null || _b === void 0 ? true : delete _b.__tabsterInstance;
    }

    delete this._win;
  };

  Tabster.dispose = function (instance) {
    instance.dispose();
  };

  Tabster.prototype.storageEntry = function (uid, addremove) {
    var entry = this._storage[uid];

    if (entry) {
      if (addremove === false && Object.keys(entry).length === 0) {
        delete this._storage[uid];
      }
    } else if (addremove === true) {
      entry = this._storage[uid] = {};
    }

    return entry;
  };

  Tabster.forceCleanup = function (tabster) {
    if (!tabster._win) {
      return;
    }

    tabster._forgetMemorizedElements.push(tabster._win.document.body);

    if (tabster._forgetMemorizedTimer) {
      return;
    }

    tabster._forgetMemorizedTimer = tabster._win.setTimeout(function () {
      delete tabster._forgetMemorizedTimer;

      for (var el = tabster._forgetMemorizedElements.shift(); el; el = tabster._forgetMemorizedElements.shift()) {
        clearElementCache(tabster.getWindow, el);
        FocusedElementState.forgetMemorized(tabster.focusedElement, el);
      }
    }, 0);
    cleanupWeakRefStorage(tabster.getWindow, true);
  };

  return Tabster;
}();
function forceCleanup(tabster) {
  // The only legit case for calling this method is when you've completely removed
  // the application DOM and not going to add the new one for a while.
  Tabster.forceCleanup(tabster);
}
/**
 * Creates an instance of Tabster, returns the current window instance if it already exists.
 */

function createTabster(win, props) {
  var existingAh = getCurrentTabster(win);

  if (existingAh) {
    if (process.env.NODE_ENV !== "production") {
      console.warn('Attempted to create a duplicate Tabster instance on the window');
    }

    return existingAh;
  }

  var tabster = new Tabster(win, props);
  win.__tabsterInstance = tabster;
  return tabster;
}
function getOutline(tabster) {
  var tabsterInternal = tabster;

  if (!tabsterInternal.outline) {
    var outline_1 = new OutlineAPI(tabster);
    tabsterInternal.outline = outline_1;

    tabsterInternal.outlineDispose = function () {
      OutlineAPI.dispose(outline_1);
    };
  }

  return tabsterInternal.outline;
}
/**
 * Creates a new new deloser instance or returns an existing one
 * @param tabster Tabster instance
 * @param props Deloser props
 */

function getDeloser(tabster, props) {
  var tabsterInternal = tabster;

  if (!tabsterInternal.deloser) {
    var deloser_1 = new DeloserAPI(tabster, props);
    tabsterInternal.deloser = deloser_1;

    tabsterInternal.deloserDispose = function () {
      DeloserAPI.dispose(deloser_1);
    };
  }

  return tabsterInternal.deloser;
}
/**
 * Creates a new modalizer instance or returns an existing one
 * @param tabster Tabster instance
 */

function getModalizer(tabster) {
  var tabsterInternal = tabster;

  if (!tabsterInternal.modalizer) {
    var modalizer_1 = new ModalizerAPI(tabster);
    tabsterInternal.modalizer = modalizer_1;

    tabsterInternal.modalizerDispose = function () {
      ModalizerAPI.dispose(modalizer_1);
    };
  }

  return tabsterInternal.modalizer;
}
function getObservedElement(tabster) {
  var tabsterInternal = tabster;

  if (!tabsterInternal.observedElement) {
    var observedElement_1 = new ObservedElementAPI(tabster);
    tabsterInternal.observedElement = observedElement_1;

    tabsterInternal.observedElementDispose = function () {
      ObservedElementAPI.dispose(observedElement_1);
    };
  }

  return tabsterInternal.observedElement;
}
function getCrossOrigin(tabster) {
  var tabsterInternal = tabster;

  if (!tabsterInternal.crossOrigin) {
    getDeloser(tabster);
    getOutline(tabster);
    getObservedElement(tabster);
    var crossOrigin_1 = new CrossOriginAPI(tabster);
    tabsterInternal.crossOrigin = crossOrigin_1;

    tabsterInternal.crossOriginDispose = function () {
      CrossOriginAPI.dispose(crossOrigin_1);
    };
  }

  return tabsterInternal.crossOrigin;
}
function disposeTabster(tabster) {
  Tabster.dispose(tabster);
}
function getTabsterAttribute(props, plain) {
  var _a;

  var attr = props ? JSON.stringify(props) : undefined;

  if (plain === true) {
    return attr;
  }

  return _a = {}, _a[TabsterAttributeName] = attr, _a;
}
/**
 * Returns an instance of Tabster if it already exists on the window .
 * @param win window instance that could contain an Tabster instance.
 */

function getCurrentTabster(win) {
  return win.__tabsterInstance;
}

export { Types, createTabster, disposeTabster, forceCleanup, getCrossOrigin, getCurrentTabster, getDeloser, getModalizer, getObservedElement, getOutline, getTabsterAttribute, setBasics as overrideBasics };
//# sourceMappingURL=tabster.esm.js.map
