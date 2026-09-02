import {
  convertAccessBuffer,
  isAccessFileName,
  toMysqlName,
  uniqueMysqlName,
  type ConvertOptions,
  type ConvertResult,
} from "@/lib/access-to-mysql";

export type FileInput = {
  name: string;
  buffer: Buffer;
};

export function convertAccessFiles(
  files: FileInput[],
  options: ConvertOptions = {},
): ConvertResult[] {
  const accessFiles = files.filter((file) => isAccessFileName(file.name));
  if (accessFiles.length === 0) {
    throw new Error("没有找到 .mdb 或 .accdb 文件");
  }

  const usedNames = new Set<string>();
  const sharedName =
    accessFiles.length === 1 ? options.databaseName?.trim() : undefined;

  return accessFiles.map((file) => {
    try {
      const extension = file.name.match(/\.([^.]+)$/)?.[1] ?? "";
      const desired = toMysqlName(sharedName || file.name);
      const databaseName = uniqueMysqlName(desired, usedNames, extension);
      return convertAccessBuffer(file.buffer, file.name, {
        ...options,
        databaseName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "转换失败";
      throw new Error(`${file.name}: ${message}`);
    }
  });
}
