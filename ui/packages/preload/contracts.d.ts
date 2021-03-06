/* eslint-disable @typescript-eslint/consistent-type-imports */
interface Exposed {
  readonly nodeCrypto: Readonly<typeof import('./src/nodeCrypto').nodeCrypto>;
  readonly versions: Readonly<typeof import('./src/versions').versions>;
  readonly requestRPC: Readonly<typeof import('./src/requestRPC').requestRPC>;
  readonly desktopPath: Readonly<typeof import('./src/desktopPath').desktopPath>;
  readonly pathSelector: Readonly<typeof import('./src/pathSelector').pathSelector>;
}


// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Window extends Exposed {}
