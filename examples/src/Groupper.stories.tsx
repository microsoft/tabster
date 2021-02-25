import { getAbilityHelpersAttribute } from 'ability-helpers';
import { Item } from './components/Item';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  title: 'Groupper',
};

export const NestedGrouppers = () => (
    <div { ...getAbilityHelpersAttribute({ root: {} }) }>
        <div aria-label='Main' { ...getAbilityHelpersAttribute({ modalizer: { id: 'main' }, deloser: {} }) }>
            <div>
                <Item />
                <Item />

                <Item>
                    <div>
                        <Item />

                        <Item>
                            <div>
                                <Item/>
                                <Item />

                                <Item>
                                    <div>
                                        <Item />
                                        <Item />
                                        <Item />
                                    </div>
                                </Item>

                                <Item/>
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

    </div>
)