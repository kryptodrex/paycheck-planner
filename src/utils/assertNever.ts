/**
 * Exhaustiveness check helper. Call this in the `default` branch of a switch
 * (or an if/else chain) that should cover every member of a union type.
 *
 * If TypeScript sees a reachable call to assertNever, it will report a
 * compile error because the `never` parameter cannot be satisfied — which
 * means a union member is unhandled.
 *
 * At runtime it throws, so any unexpected value is surfaced immediately
 * rather than silently falling through.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
