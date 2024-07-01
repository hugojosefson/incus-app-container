/**
 * Means the same as `undefined`.
 *
 * Use it as a `default` value with {@link BreadcCommand.option}, in case you
 * also use `cast` to enforce a type.
 *
 * Because {@link BreadcCommand.option} tries to cast the default value when you
 * set it up, it will otherwise fail if the default value is `undefined`. By
 * using this symbol instead of `undefined`, you can avoid failing at setup, if
 * you check for it in your `cast` function.
 */
export const NO_DEFAULT_VALUE: unique symbol = Symbol("NO_DEFAULT_VALUE");
