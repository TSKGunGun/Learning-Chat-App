import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const IMPORT_SPECIFIER_PATTERN =
  /(?<prefix>\bfrom\s*["']|\bimport\s*["'])(?<specifier>[^"']+)(?<suffix>["'])/g;

const toPosixPath = (value) => value.replaceAll(path.sep, "/");

const normalizeRelativeSpecifier = (value) => {
  if (path.extname(value) !== "") {
    return value;
  }

  return `${value}.js`;
};

const resolveAliasSpecifier = (filePath, specifier) => {
  const targetPath = path.resolve(DIST_DIR, `${specifier.slice(2)}.js`);
  const relativePath = path.relative(path.dirname(filePath), targetPath);
  const normalizedPath = toPosixPath(relativePath);

  if (normalizedPath.startsWith(".")) {
    return normalizedPath;
  }

  return `./${normalizedPath}`;
};

const rewriteSpecifier = (filePath, specifier) => {
  if (specifier.startsWith("@/")) {
    return resolveAliasSpecifier(filePath, specifier);
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return normalizeRelativeSpecifier(specifier);
  }

  return specifier;
};

const collectJavaScriptFiles = async (directoryPath) => {
  const directoryEntries = await readdir(directoryPath, { withFileTypes: true });
  const nestedEntries = await Promise.all(
    directoryEntries.map(async (directoryEntry) => {
      const entryPath = path.join(directoryPath, directoryEntry.name);

      if (directoryEntry.isDirectory()) {
        return collectJavaScriptFiles(entryPath);
      }

      if (directoryEntry.isFile() && entryPath.endsWith(".js")) {
        return [entryPath];
      }

      return [];
    })
  );

  return nestedEntries.flat();
};

const rewriteFileImports = async (filePath) => {
  const fileContents = await readFile(filePath, "utf8");
  const rewrittenContents = fileContents.replace(
    IMPORT_SPECIFIER_PATTERN,
    (fullMatch, _prefix, _specifier, _suffix, _offset, _source, groups) => {
      const nextSpecifier = rewriteSpecifier(filePath, groups.specifier);

      if (nextSpecifier === groups.specifier) {
        return fullMatch;
      }

      return `${groups.prefix}${nextSpecifier}${groups.suffix}`;
    }
  );

  if (rewrittenContents !== fileContents) {
    await writeFile(filePath, rewrittenContents, "utf8");
  }
};

const main = async () => {
  const javascriptFiles = await collectJavaScriptFiles(DIST_DIR);
  await Promise.all(javascriptFiles.map(rewriteFileImports));
};

await main();
