declare module 'vitest' {
  export const describe: (name: string, fn: () => void) => void;
  export const it: (name: string, fn: () => void) => void;
  type ExpectMatchers = {
    toEqual: (expected: unknown) => void;
    toBe: (expected: unknown) => void;
    toHaveLength: (expected: number) => void;
    toBeNull: () => void;
    toThrow: () => void;
    not: ExpectMatchers;
  };
  export const expect: (value: unknown) => ExpectMatchers;
}
