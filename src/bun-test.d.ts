declare module "bun:test" {
  export const mock: {
    module(specifier: string, factory: () => unknown): void;
  };
}
