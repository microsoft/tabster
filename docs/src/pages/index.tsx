/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import React from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./index.module.css";

export default function Home(): React.ReactElement {
    const { siteConfig } = useDocusaurusContext();
    return (
        <Layout
            title={siteConfig.title}
            description="Tabindex on steroids: keyboard navigation, focus trapping, and focus restoration for web applications."
        >
            <main className={styles.main}>
                <h1>{siteConfig.title}</h1>
                <img
                    src="/img/tabster.png"
                    className="image image_logo"
                    alt=""
                />
                <em className={styles.motto}>Tabindex on steroids.</em>
                <p>
                    A framework-agnostic set of tools for keyboard navigation,
                    focus trapping, and focus restoration in web applications.
                </p>
                <div className={styles.cta}>
                    <a
                        className="button button--primary button--lg"
                        href="/docs/intro"
                    >
                        Getting Started
                    </a>
                    <a
                        className="button button--secondary button--lg"
                        href="/docs/api-reference"
                    >
                        API Reference
                    </a>
                    <a
                        className="button button--secondary button--lg"
                        href="https://tabster.io/storybook/"
                    >
                        Storybook
                    </a>
                </div>
                <ul className={styles.sections}>
                    <li>
                        <a href="/docs/intro">
                            <img
                                src="/img/catgettingstarted.png"
                                className="image"
                                alt=""
                            />
                            <h2>Getting Started</h2>
                            <p>Install, initialize, and enable features</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/concept">
                            <img
                                src="/img/catconcept.png"
                                className="image"
                                alt=""
                            />
                            <h2>Concept</h2>
                            <p>What Tabster is and how it works</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/core">
                            <img
                                src="/img/catcore.png"
                                className="image"
                                alt=""
                            />
                            <h2>Core</h2>
                            <p>Lifecycle, focused element, root</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/mover">
                            <img
                                src="/img/catmover.png"
                                className="image"
                                alt=""
                            />
                            <h2>Mover</h2>
                            <p>Move focus using arrow keys</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/uncontrolled">
                            <img
                                src="/img/catuncontrolled.png"
                                className="image"
                                alt=""
                            />
                            <h2>Uncontrolled</h2>
                            <p>Integrate third-party focus management</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/groupper">
                            <img
                                src="/img/catgroupper.png"
                                className="image"
                                alt=""
                            />
                            <h2>Groupper</h2>
                            <p>Group focusable items</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/deloser">
                            <img
                                src="/img/catdeloser.png"
                                className="image"
                                alt=""
                            />
                            <h2>Deloser</h2>
                            <p>Do not lose your focus</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/modalizer">
                            <img
                                src="/img/catmodalizer.png"
                                className="image"
                                alt=""
                            />
                            <h2>Modalizer</h2>
                            <p>
                                Manage modal focus and accessibility boundaries
                            </p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/observed">
                            <img
                                src="/img/catobserved.png"
                                className="image"
                                alt=""
                            />
                            <h2>Observed Element</h2>
                            <p>Wait for items to appear</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/restorer">
                            <img
                                src="/img/catmore.png"
                                className="image"
                                alt=""
                            />
                            <h2>Restorer</h2>
                            <p>Restore focus after elements disappear</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/outline">
                            <img
                                src="/img/catoutline.png"
                                className="image"
                                alt=""
                            />
                            <h2>Outline</h2>
                            <p>Custom focus outline</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/cross-origin">
                            <img
                                src="/img/catcrossorigin.png"
                                className="image"
                                alt=""
                            />
                            <h2>Cross-Origin</h2>
                            <p>Coordinate focus across iframes</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/api-reference">
                            <img
                                src="/img/tabster.png"
                                className="image"
                                alt=""
                            />
                            <h2>API Reference</h2>
                            <p>Every exported function, type, and constant</p>
                        </a>
                    </li>
                </ul>
            </main>
            <section className={styles.copyright}>
                Copyright &copy; Microsoft {new Date().getFullYear()}
            </section>
        </Layout>
    );
}
