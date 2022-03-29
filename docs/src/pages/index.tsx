/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import React from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./index.module.css";

const ImageWidth = 166;
const ImageHeight = 128;

export default function Home(): JSX.Element {
    const { siteConfig } = useDocusaurusContext();
    return (
        <Layout>
            <main className={styles.main}>
                <h1>{siteConfig.title}</h1>
                <img
                    src="/img/tabster.png"
                    width={328}
                    height={254}
                    alt="Tabster"
                />
                <em className={styles.motto}>Tabindex on steroids.</em>
                <p>
                    A set of tools to handle web application keyboard
                    navigation.
                </p>
                <ul className={styles.sections}>
                    <li>
                        <a href="/docs/concept">
                            <img
                                src="/img/catconcept.png"
                                width={ImageWidth}
                                height={ImageHeight}
                                alt="Concept"
                            />
                            <h2>Concept</h2>
                            <p>What and how</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/core">
                            <img
                                src="/img/catcore.png"
                                width={ImageWidth}
                                height={ImageHeight}
                                alt="Core"
                            />
                            <h2>Core</h2>
                            <p>Basic things</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/mover">
                            <img
                                src="/img/catmover.png"
                                width={ImageWidth}
                                height={ImageHeight}
                                alt="Mover"
                            />
                            <h2>Mover</h2>
                            <p>Move focus using arrow keys</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/groupper">
                            <img
                                src="/img/catgroupper.png"
                                width={ImageWidth}
                                height={ImageHeight}
                                alt="Groupper"
                            />
                            <h2>Groupper</h2>
                            <p>Group focusable items</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/deloser">
                            <img
                                src="/img/catdeloser.png"
                                width={ImageWidth}
                                height={ImageHeight}
                                alt="Deloser"
                            />
                            <h2>Deloser</h2>
                            <p>Do not lose your focus</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/modalizer">
                            <img
                                src="/img/catmodalizer.png"
                                width={ImageWidth}
                                height={ImageHeight}
                                alt="Modalizer"
                            />
                            <h2>Modalizer</h2>
                            <p>Create modals</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/observed">
                            <img
                                src="/img/catobserved.png"
                                width={ImageWidth}
                                height={ImageHeight}
                                alt="Observed"
                            />
                            <h2>Observed</h2>
                            <p>Wait for items to appear</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/outline">
                            <img
                                src="/img/catoutline.png"
                                width={ImageWidth}
                                height={ImageHeight}
                                alt="Outline"
                            />
                            <h2>Outline</h2>
                            <p>Custom focus outline</p>
                        </a>
                    </li>
                    <li>
                        <a href="/docs/more">
                            <img
                                src="/img/catmore.png"
                                width={ImageWidth}
                                height={ImageHeight}
                                alt="More"
                            />
                            <h2>More</h2>
                            <p>Miscellaneous things</p>
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
