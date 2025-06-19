type CaseConverterOptions = {
  deep: boolean;
};

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function objToCamelCase<T>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => objToCamelCase(item)) as unknown as T;
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, any> = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = snakeToCamel(key);
        const value = obj[key];

        result[camelKey] = objToCamelCase(value);
      }
    }
    return result as T;
  }
  return obj as T;
}

export function objToSnakeCase<T>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => objToSnakeCase(item)) as unknown as T;
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, any> = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const snakeKey = camelToSnake(key);
        const value = obj[key];

        result[snakeKey] = objToSnakeCase(value);
      }
    }
    return result as T;
  }
  return obj as T;
}
