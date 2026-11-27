import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = await mkdtemp(join(tmpdir(), "carrot-chat-api-"));
const sources = [
  "app/api/chat/route.ts",
  "lib/carrot/chat-contract.ts",
  "lib/carrot/knowledge.ts",
  "lib/carrot/model.ts",
  "lib/carrot/personality.ts",
  "lib/carrot/project-links.ts",
  "lib/carrot/rate-limit.ts",
  "lib/carrot/tool-contract.ts",
  "lib/carrot/tools.ts",
  "messages/en.json",
];
for (const file of sources) {
  const destination = join(output, file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(root, file), destination);
}

const lock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
const versions = (names) => Object.fromEntries(names.map((name) => [name, lock.packages[`node_modules/${name}`].version]));
const pkg = {
  name: "carrot-chat-api",
  private: true,
  scripts: { build: "next build", dev: "next dev", start: "next start" },
  dependencies: versions(["ai", "next", "react", "react-dom"]),
  devDependencies: versions(["typescript", "@types/node", "@types/react"]),
};
await writeFile(join(output, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
await writeFile(join(output, "next.config.mjs"), 'export default { env: { CARROT_CHAT_STANDALONE: "1" } };\n');
await writeFile(join(output, "tsconfig.json"), JSON.stringify({
  compilerOptions: {
    strict: true, noEmit: true, target: "ES2022", jsx: "react-jsx",
    module: "esnext", moduleResolution: "bundler", paths: { "@/*": ["./*"] },
  },
}, null, 2) + "\n");
console.log(output);
