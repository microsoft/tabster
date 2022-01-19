"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[719],{3905:function(e,t,n){n.d(t,{Zo:function(){return u},kt:function(){return m}});var r=n(7294);function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){o(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function c(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var s=r.createContext({}),l=function(e){var t=r.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},u=function(e){var t=l(e.components);return r.createElement(s.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},f=r.forwardRef((function(e,t){var n=e.components,o=e.mdxType,a=e.originalType,s=e.parentName,u=c(e,["components","mdxType","originalType","parentName"]),f=l(n),m=o,b=f["".concat(s,".").concat(m)]||f[m]||p[m]||a;return n?r.createElement(b,i(i({ref:t},u),{},{components:n})):r.createElement(b,i({ref:t},u))}));function m(e,t){var n=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var a=n.length,i=new Array(a);i[0]=f;var c={};for(var s in t)hasOwnProperty.call(t,s)&&(c[s]=t[s]);c.originalType=e,c.mdxType="string"==typeof e?e:o,i[1]=c;for(var l=2;l<a;l++)i[l]=n[l];return r.createElement.apply(null,i)}return r.createElement.apply(null,n)}f.displayName="MDXCreateElement"},7574:function(e,t,n){n.r(t),n.d(t,{frontMatter:function(){return c},contentTitle:function(){return s},metadata:function(){return l},toc:function(){return u},default:function(){return f}});var r=n(7462),o=n(3366),a=(n(7294),n(3905)),i=["components"],c={},s="Concept",l={unversionedId:"concept",id:"concept",title:"Concept",description:"Web applications contain many actionable elements in various combinations.",source:"@site/docs/concept.md",sourceDirName:".",slug:"/concept",permalink:"/docs/concept",tags:[],version:"current",frontMatter:{}},u=[],p={toc:u};function f(e){var t=e.components,n=(0,o.Z)(e,i);return(0,a.kt)("wrapper",(0,r.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"concept"},"Concept"),(0,a.kt)("p",null,"Web applications contain many actionable elements in various combinations."),(0,a.kt)("p",null,"From the acccessibility perspective the application should be usable with keyboard only."),(0,a.kt)("p",null,"Some HTML elements like ",(0,a.kt)("inlineCode",{parentName:"p"},"<button>")," are focusable by default (we can reach them pressing\nTab key), for other HTML elements we can use ",(0,a.kt)("inlineCode",{parentName:"p"},"tabindex")," attribute to make them focusable."),(0,a.kt)("p",null,"But that is practically all we have from the web browser perspective. Unfortunately,\nmaking actionable element focusable is not enough. Consider, for example, an infinite\nnews feed. It would be impossible to reach something after the infinite news feed using\nTab key presses, because the news feed is infinite and as you Tab through it, new actionable\nelements appear."),(0,a.kt)("p",null,(0,a.kt)("strong",{parentName:"p"},"Tabster")," is a set of tools to handle complex keyboard navigation scenarios as they would\nbe natively supported by the browser. In a declarative way, by simply adding an attribute\nto the DOM elements, Tabster allows to group focusable elements so that they can\nbehave as a single logical entity, it allows to define areas where focus is moved not just\nusing Tab key, but using arrow keys, it can help restore focus when something currently focused\nhas been removed from the DOM, it can help building modal dialogs and popups, it provides\na bunch of other functions, like the keyboard navigation state and functions to traverse\nthe focusable elements in the DOM, and many more."),(0,a.kt)("p",null,"The browsers should eventually have native alternatives for the things Tabster provide,\nbut for now it's what we can offer to make keyboard navigation implementation easier."),(0,a.kt)("p",null,"See the ",(0,a.kt)("a",{parentName:"p",href:"/docs/core"},"Core")," documentation for more."))}f.isMDXComponent=!0}}]);