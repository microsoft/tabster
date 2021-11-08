/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from '../../testing/BroTest';
import { getTabsterAttribute, Types } from '../Tabster';
import { runIfUnControlled } from './test-utils';

runIfUnControlled('DummyInputManager', () => {
  beforeAll(async () => {
    await BroTest.bootstrapTabsterPage();
  });
  describe('should update dummy inputs when DOM children update for', () => {
    const evaluateDummy = (dummyAttribute: string, elementId: string) => {
      const mover = document.getElementById(elementId) as HTMLElement;
      return { 
        first: mover.firstElementChild?.hasAttribute(dummyAttribute),
        last: mover.lastElementChild?.hasAttribute(dummyAttribute),
      };
    };

    const checkDummy = (res: ReturnType<typeof evaluateDummy>) => {
      expect(res.first).toBe(true);
      expect(res.last).toBe(true);
    };

    const appendElement = (elementId: string) => {
        const mover = document.getElementById(elementId) as HTMLElement;
        const newElement = document.createElement('button');
        newElement.textContent = 'New element append';
        mover.appendChild(newElement);
    };

    const prependElement = (elementId: string) => {
        const mover = document.getElementById(elementId) as HTMLElement;
        const newElement = document.createElement('button');
        newElement.textContent = 'New element prepend';
        mover.prepend(newElement);
    };

    it('mover', async () => {
      const attr = getTabsterAttribute({
        mover: {
          direction: Types.MoverDirections.Vertical,
          cyclic: true,
        }
      });
      const moverId = 'mover';

      const testHtml = (
        <div {...attr} id={moverId}>
          <button>Button1</button>
          <button>Button2</button>
          <button>Button3</button>
          <button>Button4</button>
        </div>
      );

      await new BroTest.BroTest(testHtml)
      .eval(evaluateDummy, Types.TabsterDummyInputAttributeName, moverId)
      .check(checkDummy)
      .eval(appendElement, moverId)
      .eval(evaluateDummy, Types.TabsterDummyInputAttributeName, moverId)
      .check(checkDummy)
      .eval(prependElement, moverId)
      .eval(evaluateDummy, Types.TabsterDummyInputAttributeName, moverId)
      .check(checkDummy);
    });

    it('groupper', async() => {
      const attr = getTabsterAttribute({
        groupper: {}
      });
      const groupperId = 'groupper';

      const testHtml = (
        <div {...attr} id={groupperId}>
          <button>Button1</button>
          <button>Button2</button>
          <button>Button3</button>
          <button>Button4</button>
        </div>
      );

      await new BroTest.BroTest(testHtml)
      .eval(evaluateDummy, Types.TabsterDummyInputAttributeName, groupperId)
      .check(checkDummy)
      .eval(appendElement, groupperId)
      .eval(evaluateDummy, Types.TabsterDummyInputAttributeName, groupperId)
      .check(checkDummy)
      .eval(prependElement, groupperId)
      .eval(evaluateDummy, Types.TabsterDummyInputAttributeName, groupperId)
      .check(checkDummy);
    });

    it('modalizerAPI', async() => {
      const attr = getTabsterAttribute({
        modalizer: {id: 'modalizer'}
      });

      const modalizerAPIId = 'modalizerAPI';

      const testHtml = (
        <div {...attr}>
          <button>Button1</button>
          <button>Button2</button>
          <button>Button3</button>
          <button>Button4</button>
        </div>
      );

      await new BroTest.BroTest(testHtml)
      .eval((modalizerAPIId) => {
        document.body.setAttribute('id', modalizerAPIId);
      }, modalizerAPIId)
      .eval(evaluateDummy, Types.TabsterDummyInputAttributeName, modalizerAPIId)
      .check(checkDummy)
      .eval(appendElement, modalizerAPIId)
      .eval(evaluateDummy, Types.TabsterDummyInputAttributeName, modalizerAPIId)
      .check(checkDummy)
      .eval(prependElement, modalizerAPIId)
      .eval(evaluateDummy, Types.TabsterDummyInputAttributeName, modalizerAPIId)
      .check(checkDummy);
    });
  });
});
