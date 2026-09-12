"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  DownloadIcon,
  FileCode2Icon,
  FolderOpenIcon,
  Loader2Icon,
  TableIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ConvertedColumn = {
  name: string;
  accessType: string;
  mysqlType: string;
  nullable: boolean;
  autoIncrement: boolean;
  primaryKey: boolean;
};

type ConvertedTable = {
  name: string;
  rowCount: number;
  columns: ConvertedColumn[];
  warnings: string[];
};

type ConvertResult = {
  sourceName: string;
  databaseName: string;
  tableCount: number;
  rowCount: number;
  tables: ConvertedTable[];
  warnings: string[];
  sql: string;
  fileName: string;
};

const ACCESS_EXT = /\.(mdb|accdb)$/i;

function isAccessFile(file: File): boolean {
  return ACCESS_EXT.test(file.name);
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ConverterApp() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [databaseName, setDatabaseName] = useState("");
  const [password, setPassword] = useState("");
  const [includeCreateDatabase, setIncludeCreateDatabase] = useState(true);
  const [includeDropTable, setIncludeDropTable] = useState(true);
  const [includeData, setIncludeData] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [converting, setConverting] = useState(false);
  const [results, setResults] = useState<ConvertResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const active = results[activeIndex] ?? null;
  const sqlPreview = useMemo(() => {
    if (!active) return "";
    if (active.sql.length <= 12000) return active.sql;
    return `${active.sql.slice(0, 12000)}\n\n-- …… SQL 过长，已截断预览。请下载完整脚本。`;
  }, [active]);

  function addFiles(next: File[]) {
    const accessFiles = next.filter(isAccessFile);
    const skipped = next.length - accessFiles.length;
    if (skipped > 0) {
      toast.warning(`已忽略 ${skipped} 个非 Access 文件`);
    }
    if (accessFiles.length === 0) {
      toast.error("请选择 .mdb 或 .accdb 文件");
      return;
    }
    setFiles((current) => {
      const seen = new Set(current.map((file) => `${file.name}:${file.size}`));
      const merged = [...current];
      for (const file of accessFiles) {
        const key = `${file.name}:${file.size}`;
        if (!seen.has(key)) {
          merged.push(file);
          seen.add(key);
        }
      }
      return merged;
    });
    setResults([]);
    setError(null);
  }

  async function convert() {
    if (files.length === 0) {
      toast.error("请先选择 Access 数据库文件");
      return;
    }

    setConverting(true);
    setError(null);

    try {
      const form = new FormData();
      for (const file of files) {
        form.append("files", file, file.name);
      }
      form.set("databaseName", databaseName);
      form.set("password", password);
      form.set("includeCreateDatabase", String(includeCreateDatabase));
      form.set("includeDropTable", String(includeDropTable));
      form.set("includeData", String(includeData));

      const response = await fetch("/api/convert", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "转换失败");
      }

      const nextResults = payload.results as ConvertResult[];
      setResults(nextResults);
      setActiveIndex(0);
      toast.success(`已转换 ${nextResults.length} 个数据库`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "转换失败";
      setError(message);
      toast.error(message);
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <DatabaseIcon className="size-3.5" />
            Access → MySQL
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            把 Access 数据库转成 MySQL 导入脚本
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            支持 <code>.mdb</code> 和 <code>.accdb</code>。转换后会生成
            <code> CREATE TABLE </code> 和 <code> INSERT </code>
            脚本，可直接用 mysql 客户端导入。
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          文件只在本次转换时处理，不会保存
        </Badge>
      </header>

      <Alert>
        <AlertCircleIcon />
        <AlertTitle>读不了你电脑上的 D:\Users\Desktop\ACCESS</AlertTitle>
        <AlertDescription>
          这个转换器运行在远程环境，无法直接打开 Windows
          本地磁盘。请把该文件夹里的数据库拖到下面，或用本机命令行批量转换同一目录。
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>选择数据库文件</CardTitle>
            <CardDescription>
              可一次选择多个文件，或直接选择整个 ACCESS 文件夹。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                "flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                addFiles(Array.from(event.dataTransfer.files));
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="mb-3 size-8 text-primary" />
              <p className="font-medium">拖放 Access 文件到这里</p>
              <p className="mt-1 text-sm text-muted-foreground">
                或点击选择 .mdb / .accdb
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon />
                选择文件
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderOpenIcon />
                选择整个文件夹
              </Button>
              {files.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFiles([]);
                    setResults([]);
                    setError(null);
                  }}
                >
                  <Trash2Icon />
                  清空
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".mdb,.accdb,application/x-msaccess"
              multiple
              className="sr-only"
              onChange={(event) => {
                addFiles(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              className="sr-only"
              // @ts-expect-error webkitdirectory is not in the React type yet
              webkitdirectory=""
              onChange={(event) => {
                addFiles(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />

            {files.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {files.map((file) => (
                  <li
                    key={`${file.name}-${file.size}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatBytes(file.size)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>导出选项</CardTitle>
            <CardDescription>
              默认生成 utf8mb4、InnoDB 脚本，适合直接导入 MySQL 5.7 / 8。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">目标数据库名（可空）</span>
              <Input
                value={databaseName}
                onChange={(event) => setDatabaseName(event.target.value)}
                placeholder="默认使用文件名，例如 库存管理"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">数据库密码（如有）</span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="未加密可留空"
              />
            </label>

            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeCreateDatabase}
                  onChange={(event) =>
                    setIncludeCreateDatabase(event.target.checked)
                  }
                  className="size-4 accent-primary"
                />
                生成 CREATE DATABASE / USE
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeDropTable}
                  onChange={(event) => setIncludeDropTable(event.target.checked)}
                  className="size-4 accent-primary"
                />
                导入前 DROP TABLE IF EXISTS
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeData}
                  onChange={(event) => setIncludeData(event.target.checked)}
                  className="size-4 accent-primary"
                />
                导出表数据（INSERT）
              </label>
            </div>

            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={convert}
              disabled={converting || files.length === 0}
            >
              {converting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <FileCode2Icon />
              )}
              {converting ? "正在转换…" : "生成 MySQL 脚本"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>转换失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {active && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">转换结果</h2>
              <p className="text-sm text-muted-foreground">
                导入示例：
                <code className="ml-1">mysql -u root -p &lt; {active.fileName}</code>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => downloadText(active.fileName, active.sql)}
              >
                <DownloadIcon />
                下载 {active.fileName}
              </Button>
              {results.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    for (const result of results) {
                      downloadText(result.fileName, result.sql);
                    }
                  }}
                >
                  <DownloadIcon />
                  下载全部 SQL
                </Button>
              )}
            </div>
          </div>

          {results.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {results.map((result, index) => (
                <Button
                  key={result.sourceName}
                  type="button"
                  size="sm"
                  variant={index === activeIndex ? "default" : "outline"}
                  onClick={() => setActiveIndex(index)}
                >
                  {result.sourceName}
                </Button>
              ))}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="源文件" value={active.sourceName} />
            <Stat label="MySQL 库名" value={active.databaseName} />
            <Stat
              label="表 / 行"
              value={`${active.tableCount} 张表 · ${active.rowCount} 行`}
            />
          </div>

          {active.warnings.length > 0 && (
            <Alert>
              <AlertCircleIcon />
              <AlertTitle>转换提示</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {active.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TableIcon className="size-4" />
                数据表
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {active.tables.map((table) => (
                <div key={table.name} className="rounded-lg border p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-medium">{table.name}</span>
                    <Badge variant="secondary">{table.rowCount} 行</Badge>
                    <Badge variant="outline">{table.columns.length} 列</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="py-1 pr-3 font-medium">列名</th>
                          <th className="py-1 pr-3 font-medium">Access</th>
                          <th className="py-1 pr-3 font-medium">MySQL</th>
                          <th className="py-1 font-medium">属性</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.columns.map((column) => (
                          <tr key={column.name} className="border-t">
                            <td className="py-1 pr-3 font-mono">{column.name}</td>
                            <td className="py-1 pr-3">{column.accessType}</td>
                            <td className="py-1 pr-3 font-mono">
                              {column.mysqlType}
                            </td>
                            <td className="py-1 text-muted-foreground">
                              {[
                                column.primaryKey ? "主键" : null,
                                column.autoIncrement ? "自增" : null,
                                column.nullable ? "可空" : "非空",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SQL 预览</CardTitle>
              <CardDescription>完整脚本请下载后导入 MySQL。</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                value={sqlPreview}
                className="min-h-72 font-mono text-xs"
              />
            </CardContent>
          </Card>
        </section>
      )}

      <Separator />

      <section className="grid gap-4 pb-10 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>导入到 MySQL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
            <p>下载 SQL 后，在本机执行：</p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-foreground">
{`mysql -u root -p < 库存管理.sql`}
            </pre>
            <p>或在 MySQL 客户端里打开脚本执行。默认字符集为 utf8mb4，中文可正常导入。</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>本机批量转换文件夹</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
            <p>如果你已经把项目放到本机，可以直接转换 D 盘那个目录：</p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-foreground">
{`npm install
npm run convert -- "D:\\Users\\Desktop\\ACCESS" -o .\\mysql-sql`}
            </pre>
            <p className="flex items-center gap-1 text-foreground">
              <CheckCircle2Icon className="size-4 text-primary" />
              会为每个 Access 文件生成一份同名 .sql
            </p>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border pt-6 pb-2 text-center text-xs leading-6 text-muted-foreground">
        <p>Copyright © 2026 Hangzhou Yunshuo Technology Co., Ltd.（杭州云硕科技有限公司）</p>
        <p>Access 转 MySQL v1.0.2</p>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 truncate font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}
