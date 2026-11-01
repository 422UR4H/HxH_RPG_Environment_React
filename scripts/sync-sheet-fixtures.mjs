// Copia a fixture de paridade da ficha do repo do back para o motor do front.
// Uso: npm run sync:sheet-fixtures [-- <caminho do repo do back>]
// Padrão: ../HxH_RPG_System (os dois repos lado a lado).
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const backRepo = resolve(process.argv[2] ?? "../HxH_RPG_System");
const source = resolve(backRepo, "internal/app/api/sheet/testdata/sheet_parity.json");
const target = resolve("src/features/sheet/engine/__fixtures__/sheet_parity.json");

if (!existsSync(source)) {
  console.error(`Fixture não encontrada em ${source}.`);
  console.error("Passe o caminho do repo do back: npm run sync:sheet-fixtures -- <caminho>");
  process.exit(1);
}
copyFileSync(source, target);
console.log(`Copiado ${source} -> ${target}. Rode npm run test para conferir a paridade.`);
