// Type shim for @nestjs/core — required because NestJS 11 ships
// its types via @nestjs/common re-exports rather than its own .d.ts
declare module '@nestjs/core' {
  export * from '@nestjs/common';
  export class NestFactory {
    static create(module: any, options?: any): Promise<any>;
  }
  export class Reflector {
    get<T>(metadataKey: any, target: any): T;
    getAll<T extends any[]>(metadataKey: any, targets: any[]): T;
    getAllAndOverride<T>(metadataKey: any, targets: any[]): T;
    getAllAndMerge<T extends any[]>(metadataKey: any, targets: any[]): T;
  }
}
