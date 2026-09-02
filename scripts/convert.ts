#!/usr/bin/env npx tsx

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  convertAccessBuffer,
  isAccessFileName,
  toMysqlName,
  uniqueMysqlName,
  type ConvertOptions,
} from "../src/lib/access-to-mysql";

type CliOptions = ConvertOptions & {
  input: string;
  output: string;
};

function printHelp() {
  console.log(`Access → MySQL 转换器

用法:
  npm run convert -- <输入文件或目录> -o <输出目录>

示例:
  npm run convert -- "D:\\\\Users\\\\Desktop\\\\ACCESS" -o .\\\\mysql-sql
  npm run convert -- ./sample.mdb -o ./out --no-data

选项:
  -o, --out DIR          输出目录（默认 ./mysql-sql）
  --db NAME              目标数据库名（单文件时可用）
  --password PASS        Access 数据库密码
  --no-create-db         不生成 CREATE DATABASE
  --no-drop              不生成 DROP TABLE
  --no-data              只导出表结构
  -h, --help             显示帮助
`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    input: "",
    output: "./mysql-sql",
    includeCreateDatabase: true,
    includeDropTable: true,
    includeData: true,
  };

  const rest: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }
    if (arg === "-o" || arg === "--out") {
      options.output = argv[i + 1] ?? options.output;
      i += 1;
      continue;
    }
    if (arg === "--db") {
      options.databaseName = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--password") {
      options.password = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--no-create-db") {
      options.includeCreateDatabase = false;
      continue;
    }
    if (arg === "--no-drop") {
      options.includeDropTable = false;
      continue;
    }
    if (arg === "--no-data") {
      options.includeData = false;
      continue;
    }
    rest.push(arg);
  }

  if (rest.length === 0) {
    printHelp();
    process.exit(1);
  }
  options.input = rest[0];
  return options;
}

async function collectAccessFiles(inputPath: string): Promise<string[]> {
  const info = await stat(inputPath);
  if (info.isFile()) {
    if (!isAccessFileName(inputPath)) {
      throw new Error(`不是 Access 文件: ${inputPath}`);
    }
    return [inputPath];
  }

  const entries = await readdir(inputPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && isAccessFileName(entry.name))
    .map((entry) => path.join(inputPath, entry.name));

  if (files.length === 0) {
    throw new Error(`目录中没有 .mdb / .accdb 文件: ${inputPath}`);
  }
  return files.sort();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = await collectAccessFiles(options.input);
  await mkdir(options.output, { recursive: true });
  const usedNames = new Set<string>();
  const sharedName = files.length === 1 ? options.databaseName : undefined;

  for (const file of files) {
    const buffer = await readFile(file);
    const basename = path.basename(file);
    const extension = path.extname(file).slice(1);
    const databaseName = uniqueMysqlName(
      toMysqlName(sharedName || basename),
      usedNames,
      extension,
    );
    const result = convertAccessBuffer(buffer, basename, {
      databaseName,
      password: options.password,
      includeCreateDatabase: options.includeCreateDatabase,
      includeDropTable: options.includeDropTable,
      includeData: options.includeData,
    });
    const outPath = path.join(options.output, result.databaseName + ".sql");
    await writeFile(outPath, result.sql, "utf8");
    console.log(
      `OK  ${path.basename(file)} → ${outPath}  (${result.tableCount} 表, ${result.rowCount} 行)`,
    );
    for (const warning of result.warnings) {
      console.log(`  警告: ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
