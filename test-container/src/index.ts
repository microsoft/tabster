import {
    getModalizer,
    createTabster,
    getDeloser,
    getOutline,
    getMover,
    getGroupper,
    getObservedElement
} from 'tabster';

const tabster = createTabster(window);
console.log('created tabster');

getModalizer(tabster)
console.log('created modalizer')
getDeloser(tabster)
console.log('created deloser')
getOutline(tabster)
console.log('created outline')
getMover(tabster)
console.log('created mover')
getGroupper(tabster)
console.log('created groupper')
getObservedElement(tabster)
console.log('created observed');

// @ts-ignore
console.log('initialized tabster', window.__tabsterInstance);
