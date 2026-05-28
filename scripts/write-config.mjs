import { mkdirSync, writeFileSync } from "node:fs";

const apiKey = process.env.API_KEY || "";

mkdirSync("src", { recursive: true });
writeFileSync(
  "src/generated-config.ts",
  `export const BUILD_API_KEY = ${JSON.stringify(apiKey)};\n`,
  "utf8"
);

console.log(apiKey ? "Build API key config generated." : "No API_KEY build variable found.");
