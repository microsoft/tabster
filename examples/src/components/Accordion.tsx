import { getCurrentTabster, Types as TabsterTypes } from "tabster";
import * as React from "react";

const AccordionContext = React.createContext<Accordion | undefined>(undefined);

interface AccordionState {
    hasFocus: boolean;
}

export class Accordion extends React.PureComponent<{}, AccordionState> {
    expandedSection?: AccordionSection;

    constructor(props: {}) {
        super(props);
        this.state = { hasFocus: false };
    }

    render() {
        return (
            <div className={`Accordion${this.state.hasFocus ? " focus" : ""}`}>
                <AccordionContext.Provider value={this}>
                    {this.props.children}
                </AccordionContext.Provider>
            </div>
        );
    }
}

interface AccordionSectionProps {
    title: string;
}

interface AccordionSectionState {
    isExpanded: boolean;
}

export class AccordionSection extends React.PureComponent<
    AccordionSectionProps,
    AccordionSectionState
> {
    private static _index = 0;
    private _index: number;
    private _div: HTMLDivElement | undefined;
    private _accordion: Accordion | undefined;

    constructor(props: AccordionSectionProps, context: any) {
        super(props);
        this.state = { isExpanded: false };
        this._index = ++AccordionSection._index;
    }

    render() {
        return (
            <AccordionContext.Consumer>
                {(accordion) => {
                    this._accordion = accordion;

                    return (
                        <div ref={this._onRef}>
                            <h3>
                                <button
                                    aria-expanded={
                                        this.state.isExpanded ? true : undefined
                                    }
                                    className="Accordion-trigger"
                                    aria-controls={`accordion-section-${this._index}`}
                                    id={`accordion-section-title-${this._index}`}
                                    onClick={this._toggle}
                                >
                                    <span className="Accordion-title">
                                        {this.props.title}
                                        <span className="Accordion-icon"></span>
                                    </span>
                                </button>
                            </h3>
                            <div
                                id={`accordion-section-${this._index}`}
                                role="region"
                                aria-labelledby={`accordion-section-title-${this._index}`}
                                className="Accordion-panel"
                                hidden={
                                    this.state.isExpanded ? undefined : true
                                }
                            >
                                <div>{this.props.children}</div>
                            </div>
                        </div>
                    );
                }}
            </AccordionContext.Consumer>
        );
    }

    private _onRef = (div: HTMLDivElement | null) => {
        const tabster = getCurrentTabster(window);

        if (div) {
            this._div = div;

            tabster?.focusable.addGroupper(div, undefined, {
                onChange: this._onChange,
            });

            if (this._accordion && !this._accordion.expandedSection) {
                this._accordion.expandedSection = this;
                this.setState({ isExpanded: true });
            }
        } else if (this._div) {
            tabster?.focusable.removeGroupper(this._div);

            if (this._accordion?.expandedSection === this) {
                this._accordion.expandedSection = undefined;
            }

            delete this._div;
        }
    };

    private _toggle = () => {
        if (this._accordion) {
            if (
                this._accordion.expandedSection &&
                this._accordion.expandedSection !== this
            ) {
                this._accordion.expandedSection.setState({ isExpanded: false });
            }

            this._accordion.expandedSection = this;

            this.setState({ isExpanded: true });
        }
    };

    private _onChange = (state: TabsterTypes.GroupperState) => {
        if (this._div && this._accordion) {
            const hasFocus = state.hasFocus || state.siblingHasFocus;
            if (this._accordion.state.hasFocus !== hasFocus) {
                this._accordion.setState({ hasFocus });
            }
        }
    };
}
