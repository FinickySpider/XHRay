import { matchRulesForEvent } from '../src/matchers/rules.js';

describe('Rule Matching', () => {
  it('should match a rule by selector', () => {
    const rules = [
      { name: 'Submit Button', selector: '.submit-btn' }
    ];
    const mock = { element: { matches: (s) => s === '.submit-btn' }, selector: '.submit-btn' };
    matchRulesForEvent.call({ rules }, mock);
    expect(mock.rulesMatched).toContain('Submit Button');
  });
});