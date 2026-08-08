import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// O cache de deduplicação é um `const` de módulo. Para isolar cada teste,
// resetamos os módulos e reimportamos dinamicamente — sem expor API de
// limpeza só para teste na superfície de produção.
async function loadModule() {
  vi.resetModules();
  return (await import("../avatarTexture")).getAvatarBlobUrl;
}

function okResponse() {
  return { ok: true, blob: async () => new Blob(["x"]) };
}

describe("getAvatarBlobUrl", () => {
  // jsdom não implementa URL.createObjectURL. Substituímos só o método estático —
  // trocar o `URL` global inteiro quebraria `new URL(...)` no resto da suite.
  const originalCreateObjectURL = URL.createObjectURL;

  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      value: () => "blob:fake",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      value: originalCreateObjectURL,
      writable: true,
      configurable: true,
    });
    vi.unstubAllGlobals();
  });

  it("deduplica: duas chamadas com a mesma URL fazem um único fetch", async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const getAvatarBlobUrl = await loadModule();

    const [a, b] = await Promise.all([
      getAvatarBlobUrl("https://cdn.example/a.png"),
      getAvatarBlobUrl("https://cdn.example/a.png"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe("blob:fake");
    expect(b).toBe("blob:fake");
  });

  it("anexa ?pixi=1 quando a URL não tem query", async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const getAvatarBlobUrl = await loadModule();

    await getAvatarBlobUrl("https://cdn.example/a.png");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://cdn.example/a.png?pixi=1",
      { mode: "cors" },
    );
  });

  it("anexa &pixi=1 quando a URL já tem query", async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const getAvatarBlobUrl = await loadModule();

    await getAvatarBlobUrl("https://cdn.example/a.png?v=2");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://cdn.example/a.png?v=2&pixi=1",
      { mode: "cors" },
    );
  });

  it("resolve null (sem rejeitar) quando a resposta não é ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, blob: async () => new Blob() })));
    const getAvatarBlobUrl = await loadModule();

    await expect(getAvatarBlobUrl("https://cdn.example/missing.png")).resolves.toBeNull();
  });

  it("resolve null (sem propagar) quando o fetch rejeita", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const getAvatarBlobUrl = await loadModule();

    await expect(getAvatarBlobUrl("https://cdn.example/boom.png")).resolves.toBeNull();
  });
});
