import { mock } from 'bun:test';

/**
 * Due to an issue with Bun (https://github.com/oven-sh/bun/issues/7823), we need to manually restore mocked modules
 * after we're done. We do this by setting the mocked value to the original module.
 *
 * Also WAITING for --isolate flag to be implemented in Bun: https://github.com/oven-sh/bun/issues/12823
 * TO REPRODUCE RUN `bun test --seed 1 and 2` so that bundler test is before file-manager-includes test, which also uses node:path
 *
 * When setting up a test that will mock a module, the block should add this:
 * const moduleMocker = new ModuleMocker()
 *
 * afterEach(() => {
 *   moduleMocker.clear()
 * })
 *
 * When a test mocks a module, it should do it this way:
 *
 * await moduleMocker.mock('@/services/token.ts', () => ({
 *   getBucketToken: mock(() => {
 *     throw new Error('Unexpected error')
 *   })
 * }))
 *
 */
type MockResult = {
    clear: () => void;
};
export class ModuleMocker {
    private mocks: MockResult[] = [];

    async mock(modulePath: string, renderMocks: () => Record<string, unknown>) {
        const original = {
            ...(await import(modulePath))
        };
        const mocks = renderMocks();
        const result = {
            ...original,
            ...mocks
        };
        mock.module(modulePath, () => result);

        this.mocks.push({
            clear: () => {
                mock.module(modulePath, () => original);
            }
        });
    }

    clear() {
        this.mocks.forEach(mockResult => mockResult.clear());
        this.mocks = [];
    }
}
