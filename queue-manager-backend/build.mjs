import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const rootDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(rootDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(rootDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: [
      "*.node", "sharp", "better-sqlite3", "sqlite3", "canvas", "bcrypt",
      "argon2", "fsevents", "re2", "pg-native", "nodemailer", "handlebars",
      "knex", "typeorm", "protobufjs", "@prisma/client", "@mikro-orm/*",
      "@grpc/*", "@aws-sdk/*", "@azure/*", "@opentelemetry/*",
      "@google-cloud/*", "googleapis", "firebase-admin", "mysql2",
      "playwright", "puppeteer", "puppeteer-core", "electron",
    ],
    sourcemap: "linked",
    plugins: [
      esbuildPluginPino({ transports: ["pino-pretty"] }),
    ],
    banner: {
      js: `import { createRequire as __cr } from 'node:module';
import __path from 'node:path';
import __url from 'node:url';
globalThis.require = __cr(import.meta.url);
globalThis.__filename = __url.fileURLToPath(import.meta.url);
globalThis.__dirname = __path.dirname(globalThis.__filename);
`,
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
