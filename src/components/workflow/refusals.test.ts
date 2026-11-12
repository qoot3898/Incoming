import { describe, expect, it } from 'vitest';
import { splitParties } from './refusals';

const NOT_NOW = 'ليست هذه خطوة هذه الجهة الآن.';

describe('splitParties', () => {
  it('puts parties refused for the same reason in one group, in the order they appear', () => {
    const { open, refused } = splitParties([
      { party: 'LaborSection', refusal: NOT_NOW },
      { party: 'HumanResources', refusal: NOT_NOW },
      { party: 'Operations', refusal: NOT_NOW },
      { party: 'GeneralManager', refusal: NOT_NOW },
    ] as const);
    expect(open).toEqual([]);
    expect(refused).toEqual([{ parties: ['LaborSection', 'HumanResources', 'Operations', 'GeneralManager'], text: NOT_NOW }]);
  });

  it('keeps the parties he may decide for apart from the refused ones', () => {
    const { open, refused } = splitParties([
      { party: 'LaborSection', refusal: NOT_NOW },
      { party: 'Operations', refusal: null },
      { party: 'GeneralManager', refusal: NOT_NOW },
    ] as const);
    expect(open.map((p) => p.party)).toEqual(['Operations']);
    expect(refused).toEqual([{ parties: ['LaborSection', 'GeneralManager'], text: NOT_NOW }]);
  });

  it('keeps different reasons as separate groups', () => {
    const other = 'بتّ المستخدم في خطوة أخرى من هذه الجولة.';
    const { refused } = splitParties([
      { party: 'LaborSection', refusal: NOT_NOW },
      { party: 'HumanResources', refusal: other },
      { party: 'Operations', refusal: NOT_NOW },
    ] as const);
    expect(refused).toEqual([
      { parties: ['LaborSection', 'Operations'], text: NOT_NOW },
      { parties: ['HumanResources'], text: other },
    ]);
  });

  it('treats a missing refusal like null and returns nothing for no parties', () => {
    expect(splitParties([{ party: 'Operations' }] as const).open).toHaveLength(1);
    expect(splitParties([])).toEqual({ open: [], refused: [] });
  });
});
