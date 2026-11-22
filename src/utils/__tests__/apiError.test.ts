import type { AxiosResponse } from "axios";
import { describe, it, expect } from "vitest";
import axios from "axios";
import { getApiErrorDetail, isConnectionError } from "../apiError";

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


  const buildError = (data: unknown) => {
    const error = new axios.AxiosError("Request failed");
    error.response = {
      status: 422,
      statusText: "Unprocessable Entity",
      headers: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: { headers: {} } as any,
      data,
    } as AxiosResponse;
    return error;
  };

  it("returns null when the body has a non-empty errors array (library validation)", () => {
    const error = buildError({
      detail: "validation failed",
      errors: [{ message: "expected string", location: "body.email", value: 1 }],
    });
    expect(getApiErrorDetail(error)).toBeNull();
  });

  it("returns detail when errors is an empty array", () => {
    expect(getApiErrorDetail(buildError({ detail: "Informe o nick (apelido).", errors: [] }))).toBe(
      "Informe o nick (apelido).",
    );
  });

  it("returns detail when there is no errors field", () => {
    expect(getApiErrorDetail(buildError({ detail: "Informe o nick (apelido)." }))).toBe(
      "Informe o nick (apelido).",
    );
  });
});

describe("isConnectionError", () => {
  it("é true para erro do axios sem response (rede caiu)", () => {
    expect(isConnectionError(new axios.AxiosError("Network Error"))).toBe(true);
  });

  it("é false para erro do axios com response", () => {
    const error = new axios.AxiosError("Request failed");
    error.response = { status: 500 } as AxiosResponse;
    expect(isConnectionError(error)).toBe(false);
  });

  it("é false para erro que não é do axios", () => {
    expect(isConnectionError(new Error("boom"))).toBe(false);
    expect(isConnectionError(undefined)).toBe(false);
  });
});
