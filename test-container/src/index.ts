import { getModalizer, createTabster, getDeloser, getOutline, getObservedElement } from 'tabster';

const tabster = createTabster(window);
console.log('created tabster');

getModalizer(tabster)
console.log('created modalizer')
getDeloser(tabster)
console.log('created deloser')
getOutline(tabster)
console.log('created outline')
getObservedElement(tabster)
console.log('created observed');

// @ts-ignore
console.log('initialized tabster', window.__tabsterInstance);
