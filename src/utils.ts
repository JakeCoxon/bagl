export function assign2<T extends object, S extends object>(target: T, source: S): T & S {
  for (const key of Object.keys(source)) {
    if (Object.getOwnPropertyDescriptor(source, key)) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)!);
    } else {
      (target as any)[key] = (source as any)[key];
    }
  }
  return (target as any);
}