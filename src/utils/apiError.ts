import axios from "axios";

/**
 * Extrai a mensagem específica de um erro da nossa API.
 *
 * O backend usa huma, que responde RFC7807 (problem+json): o campo com a explicação
 * daquela ocorrência é `detail`. Não existe `message` — quatro páginas liam esse campo
 * inexistente e por isso sempre mostravam o texto genérico ao usuário.
 *
 * Devolve `null` quando não há mensagem aproveitável, para o chamador aplicar o próprio
 * fallback com `??`.
 */
export function getApiErrorDetail(err: unknown): string | null {
  // Verify it's an axios error
  if (!axios.isAxiosError(err)) {
    return null;
  }

  // Verify response exists
  if (!err.response) {
    return null;
  }

  // Verify data exists and is an object (not a string or other type)
  const data = err.response.data;
  if (typeof data !== "object" || data === null) {
    return null;
  }

  // Extract detail field
  const detail = (data as Record<string, unknown>).detail;

  // Verify detail is a string
  if (typeof detail !== "string") {
    return null;
  }

  // Return null for empty string (not useful to display)
  if (detail === "") {
    return null;
  }

  return detail;
}
