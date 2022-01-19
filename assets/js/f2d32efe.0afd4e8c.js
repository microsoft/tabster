"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[547],{3905:function(e,t,r){r.d(t,{Zo:function(){return s},kt:function(){return d}});var n=r(7294);function o(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function a(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function i(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?a(Object(r),!0).forEach((function(t){o(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):a(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function p(e,t){if(null==e)return{};var r,n,o=function(e,t){if(null==e)return{};var r,n,o={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(o[r]=e[r]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(o[r]=e[r])}return o}var l=n.createContext({}),u=function(e){var t=n.useContext(l),r=t;return e&&(r="function"==typeof e?e(t):i(i({},t),e)),r},s=function(e){var t=u(e.components);return n.createElement(l.Provider,{value:t},e.children)},c={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},b=n.forwardRef((function(e,t){var r=e.components,o=e.mdxType,a=e.originalType,l=e.parentName,s=p(e,["components","mdxType","originalType","parentName"]),b=u(r),d=o,m=b["".concat(l,".").concat(d)]||b[d]||c[d]||a;return r?n.createElement(m,i(i({ref:t},s),{},{components:r})):n.createElement(m,i({ref:t},s))}));function d(e,t){var r=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var a=r.length,i=new Array(a);i[0]=b;var p={};for(var l in t)hasOwnProperty.call(t,l)&&(p[l]=t[l]);p.originalType=e,p.mdxType="string"==typeof e?e:o,i[1]=p;for(var u=2;u<a;u++)i[u]=r[u];return n.createElement.apply(null,i)}return n.createElement.apply(null,r)}b.displayName="MDXCreateElement"},3316:function(e,t,r){r.r(t),r.d(t,{frontMatter:function(){return p},contentTitle:function(){return l},metadata:function(){return u},toc:function(){return s},default:function(){return b}});var n=r(7462),o=r(3366),a=(r(7294),r(3905)),i=["components"],p={},l="Groupper",u={unversionedId:"groupper",id:"groupper",title:"Groupper",description:"About",source:"@site/docs/groupper.md",sourceDirName:".",slug:"/groupper",permalink:"/docs/groupper",tags:[],version:"current",frontMatter:{}},s=[{value:"About",id:"about",children:[],level:2},{value:"Setup",id:"setup",children:[],level:2},{value:"Properties",id:"properties",children:[{value:"tabbability?: <em>GroupperTabbability</em>",id:"tabbability-grouppertabbability",children:[],level:3}],level:2},{value:"Examples",id:"examples",children:[],level:2}],c={toc:s};function b(e){var t=e.components,r=(0,o.Z)(e,i);return(0,a.kt)("wrapper",(0,n.Z)({},c,r,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"groupper"},"Groupper"),(0,a.kt)("h2",{id:"about"},"About"),(0,a.kt)("p",null,"Groupper allows groupping multiple focusable elements as if they were one."),(0,a.kt)("p",null,"For example, let's consider a chat application. There is a flow of messages and a\nsend new message input after. Every message might contain inner buttons (like the\nreaction buttons) and links. It would be inconvenient to Tab through every inner button\nand link when we simply need to reach the new message input. We can apply Groupper to\nthe chat message. When the Groupper element gets focus, it will require additional Enter\npress to go to the focusable elements inside the Groupper, otherwise next Tab press will\nmove focus outside of the Groupper."),(0,a.kt)("p",null,"Groupper plays well with ",(0,a.kt)("a",{parentName:"p",href:"/docs/mover"},"Mover"),"."),(0,a.kt)("p",null,"In general an element with the Groupper should be focusable (i.e. should have ",(0,a.kt)("inlineCode",{parentName:"p"},"tabindex=0"),"):"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-html"},'<div data-tabster=\'{"groupper": {...}}"\' tabindex="0" title="Group of buttons">\n    <button>Button1</button>\n    <button>Button2</button>\n    <button>Button3</button>\n</div>\n')),(0,a.kt)("h2",{id:"setup"},"Setup"),(0,a.kt)("p",null,"To get the Groupper working, we need to call the ",(0,a.kt)("inlineCode",{parentName:"p"},"getGroupper()")," function:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-ts"},'import { createTabster, getGroupper } from "tabster";\n\nlet tabsterCore = createTabster(window);\n\ngetGroupper(tabsterCore);\n')),(0,a.kt)("h2",{id:"properties"},"Properties"),(0,a.kt)("h3",{id:"tabbability-grouppertabbability"},"tabbability?: ",(0,a.kt)("em",{parentName:"h3"},"GroupperTabbability")),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"Unlimited | Limited | LimitedTrapFocus")),(0,a.kt)("p",null,"With ",(0,a.kt)("inlineCode",{parentName:"p"},"Unlimited")," tabbability the Groupper is tabbable automatically without any\nadditional Enter press to activate the Groupper. Though the Mover will still treat it\nas a singular entiry."),(0,a.kt)("p",null,"With ",(0,a.kt)("inlineCode",{parentName:"p"},"Limited")," tabbability an Enter press is needed to go to the Groupper's inner\nfocusable elements (and Esc to go back outside). Once we've entered the Groupper, we\ncan keep tabbing it's inner focusables, once the last focusable is reached, the focus\nwill move outside of the Groupper."),(0,a.kt)("p",null,"With ",(0,a.kt)("inlineCode",{parentName:"p"},"LimitedTrapFocus")," we have the same behaviour as with ",(0,a.kt)("inlineCode",{parentName:"p"},"Limited")," but the focus\nwill be trapped inside the groupper."),(0,a.kt)("h2",{id:"examples"},"Examples"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"https://tabster.io/storybook/?path=/story/groupper"},"See a few Groupper examples in the Storybook"),"."))}b.isMDXComponent=!0}}]);