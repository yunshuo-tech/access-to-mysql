import { NextResponse } from "next/server";
import { convertAccessFiles } from "@/lib/convert-files";
import type { ConvertOptions } from "@/lib/access-to-mysql";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

function boolValue(value: FormDataEntryValue | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  return value === "true" || value === "1" || value === "on";
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "请上传至少一个 .mdb 或 .accdb 文件" },
        { status: 400 },
      );
    }

    const options: ConvertOptions = {
      databaseName: String(form.get("databaseName") || "").trim() || undefined,
      password: String(form.get("password") || "").trim() || undefined,
      includeCreateDatabase: boolValue(form.get("includeCreateDatabase"), true),
      includeDropTable: boolValue(form.get("includeDropTable"), true),
      includeData: boolValue(form.get("includeData"), true),
      engine: form.get("engine") === "MyISAM" ? "MyISAM" : "InnoDB",
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
    };

    const inputs = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    );

    const results = convertAccessFiles(inputs, options).map((result) => ({
      sourceName: result.sourceName,
      databaseName: result.databaseName,
      tableCount: result.tableCount,
      rowCount: result.rowCount,
      tables: result.tables,
      warnings: result.warnings,
      sql: result.sql,
      fileName: `${result.databaseName}.sql`,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "转换失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
