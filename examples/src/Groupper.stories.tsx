/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Accordion, AccordionSection } from './components/Accordion';
import { Item } from './components/Item';
import * as React from 'react';
import { getTabsterAttribute, Types as TabsterTypes } from 'tabster';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
    title: 'Groupper',
};

export const NestedGrouppers = () => {
    const moverAttr = getTabsterAttribute({
        mover: { direction: TabsterTypes.MoverDirections.Vertical }
    }) as TabsterTypes.TabsterDOMAttribute;

    return (
        <div
            aria-label='Main'
            {...moverAttr}
        >
            <div>
                <Item />
                <Item />

                <Item>
                    <div {...moverAttr}>
                        <Item />

                        <Item>
                            <div {...moverAttr}>
                                <Item />
                                <Item />

                                <Item>
                                    <div {...moverAttr}>
                                        <Item />
                                        <Item />
                                        <Item />
                                    </div>
                                </Item>

                                <Item />
                                <Item />
                            </div>
                        </Item>

                        <Item />
                    </div>
                </Item>

                <Item />
                <Item />
            </div>
        </div>
    );
};

export const GroupperRtl = () => (
    <div dir='rtl' style={{display: 'flex'}}>
        <Item />
        <Item />
        <Item />
    </div>
);

export const AccordionPrototype = () => (
    <>
        <Accordion>
            <AccordionSection title='Personal Information'>
                <fieldset>
                    <p>
                        <label htmlFor='cufc1'>
                            Name
                            <span aria-hidden='true'>*</span>:
                        </label>
                        <input
                            type='text'
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
                            defaultValue=''
                            name='Name'
                            id='cufc1'
                            className='required'
                            aria-required='true'
                        />
                    </p>
                    <p>
                        <label htmlFor='cufc2'>
                            Email
                            <span aria-hidden='true'>*</span>:
                        </label>
                        <input
                            type='text'
                            defaultValue=''
                            name='Email'
                            id='cufc2'
                            aria-required='true'
                        />
                    </p>
                    <p>
                        <label htmlFor='cufc3'>Phone:</label>
                        <input
                            type='text'
                            defaultValue=''
                            name='Phone'
                            id='cufc3'
                        />
                    </p>
                    <p>
                        <label htmlFor='cufc4'>Extension:</label>
                        <input type='text' defaultValue='' name='Ext' id='cufc4' />
                    </p>
                    <p>
                        <label htmlFor='cufc5'>Country:</label>
                        <input
                            type='text'
                            defaultValue=''
                            name='Country'
                            id='cufc5'
                        />
                    </p>
                    <p>
                        <label htmlFor='cufc6'>City/Province:</label>
                        <input
                            type='text'
                            defaultValue=''
                            name='City_Province'
                            id='cufc6'
                        />
                    </p>
                </fieldset>
            </AccordionSection>
            <AccordionSection title='Billing Address'>
                <fieldset>
                    <p>
                        <label htmlFor='b-add1'>Address 1:</label>
                        <input type='text' name='b-add1' id='b-add1' />
                    </p>
                    <p>
                        <label htmlFor='b-add2'>Address 2:</label>
                        <input type='text' name='b-add2' id='b-add2' />
                    </p>
                    <p>
                        <label htmlFor='b-city'>City:</label>
                        <input type='text' name='b-city' id='b-city' />
                    </p>
                    <p>
                        <label htmlFor='b-state'>State:</label>
                        <input type='text' name='b-state' id='b-state' />
                    </p>
                    <p>
                        <label htmlFor='b-zip'>Zip Code:</label>
                        <input type='text' name='b-zip' id='b-zip' />
                    </p>
                </fieldset>
            </AccordionSection>
            <AccordionSection title='Shipping Address'>
                <fieldset>
                    <p>
                        <label htmlFor='m-add1'>Address 1:</label>
                        <input type='text' name='m-add1' id='m-add1' />
                    </p>
                    <p>
                        <label htmlFor='m-add2'>Address 2:</label>
                        <input type='text' name='m-add2' id='m-add2' />
                    </p>
                    <p>
                        <label htmlFor='m-city'>City:</label>
                        <input type='text' name='m-city' id='m-city' />
                    </p>
                    <p>
                        <label htmlFor='m-state'>State:</label>
                        <input type='text' name='m-state' id='m-state' />
                    </p>
                    <p>
                        <label htmlFor='m-zip'>Zip Code:</label>
                        <input type='text' name='m-zip' id='m-zip' />
                    </p>
                </fieldset>
            </AccordionSection>
        </Accordion>
    </>
);
