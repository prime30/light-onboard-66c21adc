/**
 * Converts a camelCase string to snake_case
 * @param str - The camelCase string to convert
 * @returns The string converted to snake_case
 *
 * @example
 * camelToSnake("firstName") // "first_name"
 * camelToSnake("getUserById") // "get_user_by_id"
 * camelToSnake("XMLHttpRequest") // "xml_http_request"
 */
export function camelToSnake(str: string): string {
  return (
    str
      // Insert an underscore before any uppercase letter that follows a lowercase letter or digit
      .replace(/([a-z\d])([A-Z])/g, "$1_$2")
      // Insert an underscore before any uppercase letter that follows another uppercase letter and is followed by a lowercase letter
      .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
      // Convert the entire string to lowercase
      .toLowerCase()
  );
}

// 1. Utility type to convert a single camelCase string literal to snake_case
type CamelToSnake<T extends string, A extends string = ""> = T extends `${infer F}${infer R}`
  ? CamelToSnake<R, `${A}${F extends Lowercase<F> ? "" : "_"}${Lowercase<F>}`>
  : A;
// Example: type SnakedKey = CamelToSnake<'categoryName'> // 'category_name'

// 2. Utility type to recursively convert keys of an object to snake_case
type KeysToSnakeCase<T> =
  T extends Array<infer U>
    ? Array<KeysToSnakeCase<U>>
    : T extends object
      ? {
          [K in keyof T as K extends string ? CamelToSnake<K> : K]: KeysToSnakeCase<T[K]>;
        }
      : T;

/**
 * Converts an object's keys from camelCase to snake_case
 * @param obj - The object with camelCase keys to convert
 * @returns A new object with snake_case keys
 *
 * @example
 * objectKeysToSnake({ firstName: "John", lastName: "Doe" })
 * // { first_name: "John", last_name: "Doe" }
 */
export function objectKeysToSnake<T extends object>(obj: T): KeysToSnakeCase<T> {
  const converted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as T)) {
    const snakeKey = camelToSnake(key);
    converted[snakeKey] = value;
  }

  return converted as KeysToSnakeCase<T>;
}
