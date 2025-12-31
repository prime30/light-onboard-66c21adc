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
  return str
    // Insert an underscore before any uppercase letter that follows a lowercase letter or digit
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    // Insert an underscore before any uppercase letter that follows another uppercase letter and is followed by a lowercase letter
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    // Convert the entire string to lowercase
    .toLowerCase();
}

/**
 * Converts an object's keys from camelCase to snake_case
 * @param obj - The object with camelCase keys to convert
 * @returns A new object with snake_case keys
 *
 * @example
 * objectKeysToSnake({ firstName: "John", lastName: "Doe" })
 * // { first_name: "John", last_name: "Doe" }
 */
export function objectKeysToSnake<T extends Record<string, any>>(
  obj: T
): Record<string, any> {
  const converted: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    converted[snakeKey] = value;
  }

  return converted;
}
