import type { AxiosResponse } from "axios";
import { describe, it, expect } from "vitest";
import axios from "axios";
import { getApiErrorDetail } from "../apiError";

describe("getApiErrorDetail", () => {
  it("case 1: returns detail from axios error with response.data.detail", () => {
    const error = new axios.AxiosError("Request failed");
    const response: Partial<AxiosResponse> = {
      status: 400,
      statusText: "Bad Request",
      headers: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: { headers: {} } as any,
      data: {
        detail: "Invalid request format",
      },
    };
    error.response = response as AxiosResponse;

    const result = getApiErrorDetail(error);
    expect(result).toBe("Invalid request format");
  });

  it("case 2: returns null when detail is empty string", () => {
    const error = new axios.AxiosError("Request failed");
    const response: Partial<AxiosResponse> = {
      status: 400,
      statusText: "Bad Request",
      headers: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: { headers: {} } as any,
      data: {
        detail: "",
      },
    };
    error.response = response as AxiosResponse;

    const result = getApiErrorDetail(error);
    expect(result).toBeNull();
  });

  it("case 3: returns null when axios error has no data", () => {
    const error = new axios.AxiosError("Request failed");
    const response: Partial<AxiosResponse> = {
      status: 400,
      statusText: "Bad Request",
      headers: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: { headers: {} } as any,
      data: undefined,
    };
    error.response = response as AxiosResponse;

    const result = getApiErrorDetail(error);
    expect(result).toBeNull();
  });

  it("case 4: returns null when response.data is a string instead of object", () => {
    const error = new axios.AxiosError("Request failed");
    const response: Partial<AxiosResponse> = {
      status: 500,
      statusText: "Internal Server Error",
      headers: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: { headers: {} } as any,
      data: "Internal server error",
    };
    error.response = response as AxiosResponse;

    const result = getApiErrorDetail(error);
    expect(result).toBeNull();
  });

  it("case 5: returns null for non-axios errors", () => {
    const error = new Error("boom");

    const result = getApiErrorDetail(error);
    expect(result).toBeNull();
  });

  it("case 6: returns null for undefined or null", () => {
    expect(getApiErrorDetail(undefined)).toBeNull();
    expect(getApiErrorDetail(null)).toBeNull();
  });

  it("case 7: ignores errors array and returns detail", () => {
    const error = new axios.AxiosError("Request failed");
    const response: Partial<AxiosResponse> = {
      status: 422,
      statusText: "Unprocessable Entity",
      headers: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: { headers: {} } as any,
      data: {
        detail: "Validation failed",
        errors: [
          {
            message: "Invalid field",
            field: "email",
          },
        ],
      },
    };
    error.response = response as AxiosResponse;

    const result = getApiErrorDetail(error);
    expect(result).toBe("Validation failed");
  });
});
