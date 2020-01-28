/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from './Types';

interface Announcement {
    node: HTMLDivElement;
    timer?: number;
}

const defaultProps: Types.AnnouncerProps = {
    title: 'Latest accessibility announcements',
    historyLength: 10,
    parent: undefined
};

export class Announcer implements Types.Announcer {
    private _mainWindow: Window | undefined;
    private _props: Types.AnnouncerProps = defaultProps;
    private _container: HTMLDivElement | undefined;
    private _announcements: Announcement[] = [];
    private _cleanupTimer: number | undefined;

    constructor(mainWindow?: Window) {
        if (mainWindow) {
            this._mainWindow = mainWindow;
        }
    }

    setup(props: Partial<Types.AnnouncerProps>): void {
        this._props = { ...this._props, ...props };

        if (props.parent && this._container && this._container.parentElement !== props.parent) {
            props.parent.appendChild(this._container);
        }

        if (props.title && this._container) {
            this._container.setAttribute('aria-label', props.title);
        }

        if (props.historyLength) {
            this._shrinkHistory();
        }
    }

    protected dispose(): void {
        const mainWindow = this._mainWindow;

        if (!mainWindow) {
            return;
        }

        if (!this._container) {
            return;
        }

        if (this._cleanupTimer) {
            mainWindow.clearTimeout(this._cleanupTimer);
            this._cleanupTimer = undefined;
        }

        this._announcements.forEach((a) => {
            if (a.timer) {
                mainWindow.clearTimeout(a.timer);
                a.timer = undefined;
            }
        });

        this._announcements = [];

        if (this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
            this._container = undefined;
        }
    }

    announce(text: string, assertive?: boolean): void {
        if (!this._mainWindow) {
            return;
        }

        if (!text.trim()) {
            return;
        }

        if (!this._container) {
            this._init();
        }

        if (!this._container) {
            return;
        }

        const announcementNode = document.createElement('div');

        announcementNode.setAttribute('role', assertive ? 'alert' : 'log');
        announcementNode.setAttribute('aria-live', assertive ? 'assertive' : 'polite');

        const announcementNodeStyle = announcementNode.style;

        announcementNodeStyle.position = 'absolute';

        announcementNodeStyle.left =
            announcementNodeStyle.top =
                announcementNodeStyle.right =
                    announcementNodeStyle.bottom = '0';

        const announcement: Announcement = {
            node: announcementNode
        };

        announcement.timer = this._mainWindow.setTimeout(() => {
            delete announcement.timer;
            announcement.node.innerText = text;
        }, 100);

        this._announcements.push(announcement);

        this._container.appendChild(announcementNode);

        this._shrinkHistory();
    }

    private _shrinkHistory(): void {
        if (!this._mainWindow) {
            return;
        }

        if (!this._container) {
            return;
        }

        while (this._announcements.length > this._props.historyLength) {
            const oldestAnnouncement = this._announcements.shift();

            if (oldestAnnouncement) {
                if (oldestAnnouncement.timer) {
                    this._mainWindow.clearTimeout(oldestAnnouncement.timer);
                }

                this._container.removeChild(oldestAnnouncement.node);
            }
        }

    }

    private _init(): void {
        if (!this._mainWindow) {
            return;
        }

        if (this._container) {
            return;
        }

        this._container = document.createElement('div');
        this._container.setAttribute('role', 'list');
        this._container.setAttribute('aria-label', this._props.title);

        const containerStyle = this._container.style;
        containerStyle.position = 'absolute';
        containerStyle.overflow = 'hidden';
        containerStyle.width = containerStyle.height = '1px';
        containerStyle.right = containerStyle.bottom = '0';
        containerStyle.opacity = '0';
        containerStyle.zIndex = '-1';

        const parent = this._props.parent || this._mainWindow.document.body;
        parent.appendChild(this._container);
    }
}
