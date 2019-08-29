/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export enum EventFromIFrameDescriptorType {
    Document,
    Window
}

export interface EventFromIFrameDescriptor {
    type: EventFromIFrameDescriptorType;
    name: string;
    capture: boolean;
}

export interface EventFromIFrameDetails {
    descriptor: EventFromIFrameDescriptor;
    target: HTMLElement;
    document: Document;
    window: Window;
}

export interface EventFromIFrame extends Event {
    targetDetails: EventFromIFrameDetails;
    originalEvent: Event;
}

export function setupIFrameToMainWindowEventsDispatcher(mainWindow: Window, iframeDocument: HTMLDocument,
        mainWindowCustomEventName: string, events: EventFromIFrameDescriptor[]) {

    const win = iframeDocument.defaultView;

    if (!win || (win === mainWindow)) {
        throw new Error(`setupIFrameToMainWindowEventsDispatcher() is called on a wrong document.`);
    }

    events.forEach((descriptor) => {
        switch (descriptor.type) {
            case EventFromIFrameDescriptorType.Document:
                iframeDocument.addEventListener(descriptor.name, handler, descriptor.capture);
                break;

            case EventFromIFrameDescriptorType.Window:
                win.addEventListener(descriptor.name, handler, descriptor.capture);
                break;
        }

        function handler(e: Event) {
            const event = document.createEvent('HTMLEvents') as EventFromIFrame;

            event.initEvent(mainWindowCustomEventName, true, true);

            event.originalEvent = e;

            event.targetDetails = {
                descriptor,
                target: e.target as HTMLElement,
                document: iframeDocument,
                window: win!!!
            };

            mainWindow.dispatchEvent(event);
        }
    });
}
