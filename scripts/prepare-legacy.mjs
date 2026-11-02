import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceDirectory = projectRoot;
const targetDirectory = path.join(projectRoot, "public", "legacy");
const legacyFiles = [
  "CABECEIRA DO PACIENTE.html",
  "MAPA DE DIETAS 3.0.html",
  "PROCESSO DE ENFERMAGEM.html",
  "SAE ENFERMAGEM.html",
  "eventos-adversos-preview.png",
];
const appIdsByFile = {
  "CABECEIRA DO PACIENTE.html": "cabecalho",
  "MAPA DE DIETAS 3.0.html": "dietas",
  "PROCESSO DE ENFERMAGEM.html": "processo",
  "SAE ENFERMAGEM.html": "sae",
};

await mkdir(targetDirectory, { recursive: true });

for (const file of legacyFiles) {
  const sourcePath = path.join(sourceDirectory, file);
  const targetPath = path.join(targetDirectory, file);

  if (file.endsWith(".html")) {
    const appId = appIdsByFile[file];
    if (!appId) throw new Error(`Missing system ID for ${file}`);

    const html = await readFile(sourcePath, "utf8");
    const script = `<script src="../supabase-bridge.js" data-app="${appId}"></script>`;
    const updatedHtml = html.replace(/<head([^>]*)>/i, `$&\n${script}`);

    if (updatedHtml === html) {
      throw new Error(`Could not inject the storage bridge into ${file}`);
    }

    await writeFile(targetPath, updatedHtml, "utf8");
  } else {
    await copyFile(sourcePath, targetPath);
  }
}
