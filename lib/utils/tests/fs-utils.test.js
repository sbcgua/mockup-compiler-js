const { slash } = require('../fs-utils');

// jest.mock('fs', () => require('memfs').fs);
// const { vol } = require('memfs');

// beforeEach(() => {
//     vol.reset();
// });

test('should slash path', () => {
    expect(slash('/hello/world')).toBe('/hello/world');
    expect(slash('\\hello\\world')).toBe('/hello/world');
    expect(slash('hello\\world')).toBe('hello/world');
    expect(slash('c:\\hello\\world')).toBe('c:/hello/world');
});
