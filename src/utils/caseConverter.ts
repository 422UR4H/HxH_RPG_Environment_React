type CaseConverterOptions = {
  deep: boolean;
};

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function objToCamelCase<T extends Record<string, any>>(
  obj: Record<string, any>,
  options: CaseConverterOptions = { deep: true }
): T {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key);
      const value = obj[key];

      result[camelKey] =
        options.deep &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
          ? objToCamelCase(value, options)
          : value;
    }
  }
  return result as T;
}

export function objToSnakeCase<T extends Record<string, any>>(
  obj: Record<string, any>,
  options: CaseConverterOptions = { deep: true }
): T {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key);
      const value = obj[key];

      result[snakeKey] =
        options.deep &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
          ? objToSnakeCase(value, options)
          : value;
    }
  }
  return result as T;
}
