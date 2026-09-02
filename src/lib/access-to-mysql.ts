import MDBReader, {
  type Column,
  type ColumnType,
  type Value,
} from "mdb-reader";

export type ConvertOptions = {
  databaseName?: string;
  password?: string;
  includeCreateDatabase?: boolean;
  includeDropTable?: boolean;
  includeData?: boolean;
  engine?: "InnoDB" | "MyISAM";
  charset?: string;
  collate?: string;
  batchSize?: number;
};

export type ConvertedColumn = {
  name: string;
  accessType: ColumnType;
  mysqlType: string;
  nullable: boolean;
  autoIncrement: boolean;
  primaryKey: boolean;
};

export type ConvertedTable = {
  name: string;
  rowCount: number;
  columns: ConvertedColumn[];
  warnings: string[];
};

export type ConvertResult = {
  sourceName: string;
  databaseName: string;
  tableCount: number;
  rowCount: number;
  tables: ConvertedTable[];
  warnings: string[];
  sql: string;
};

const MYSQL_RESERVED = new Set(
  [
    "accessible",
    "add",
    "all",
    "alter",
    "analyze",
    "and",
    "as",
    "asc",
    "asensitive",
    "before",
    "between",
    "bigint",
    "binary",
    "blob",
    "both",
    "by",
    "call",
    "cascade",
    "case",
    "change",
    "char",
    "character",
    "check",
    "collate",
    "column",
    "condition",
    "constraint",
    "continue",
    "convert",
    "create",
    "cross",
    "cube",
    "cume_dist",
    "current_date",
    "current_time",
    "current_timestamp",
    "current_user",
    "cursor",
    "database",
    "databases",
    "day_hour",
    "day_microsecond",
    "day_minute",
    "day_second",
    "dec",
    "decimal",
    "declare",
    "default",
    "delayed",
    "delete",
    "dense_rank",
    "desc",
    "describe",
    "deterministic",
    "distinct",
    "distinctrow",
    "div",
    "double",
    "drop",
    "dual",
    "each",
    "else",
    "elseif",
    "empty",
    "enclosed",
    "escaped",
    "except",
    "exists",
    "exit",
    "explain",
    "false",
    "fetch",
    "first_value",
    "float",
    "float4",
    "float8",
    "for",
    "force",
    "foreign",
    "from",
    "fulltext",
    "function",
    "generated",
    "get",
    "grant",
    "group",
    "grouping",
    "groups",
    "having",
    "high_priority",
    "hour_microsecond",
    "hour_minute",
    "hour_second",
    "if",
    "ignore",
    "in",
    "index",
    "infile",
    "inner",
    "inout",
    "insensitive",
    "insert",
    "int",
    "int1",
    "int2",
    "int3",
    "int4",
    "int8",
    "integer",
    "interval",
    "into",
    "io_after_gtids",
    "io_before_gtids",
    "is",
    "iterate",
    "join",
    "json_table",
    "key",
    "keys",
    "kill",
    "lag",
    "last_value",
    "lateral",
    "lead",
    "leading",
    "leave",
    "left",
    "like",
    "limit",
    "linear",
    "lines",
    "load",
    "localtime",
    "localtimestamp",
    "lock",
    "long",
    "longblob",
    "longtext",
    "loop",
    "low_priority",
    "master_bind",
    "master_ssl_verify_server_cert",
    "match",
    "maxvalue",
    "mediumblob",
    "mediumint",
    "mediumtext",
    "middleint",
    "minute_microsecond",
    "minute_second",
    "mod",
    "modifies",
    "natural",
    "not",
    "no_write_to_binlog",
    "nth_value",
    "ntile",
    "null",
    "numeric",
    "of",
    "on",
    "optimize",
    "optimizer_costs",
    "option",
    "optionally",
    "or",
    "order",
    "out",
    "outer",
    "outfile",
    "over",
    "partition",
    "percent_rank",
    "precision",
    "primary",
    "procedure",
    "purge",
    "range",
    "rank",
    "read",
    "reads",
    "read_write",
    "real",
    "recursive",
    "references",
    "references",
    "regexp",
    "release",
    "rename",
    "repeat",
    "replace",
    "require",
    "resignal",
    "restrict",
    "return",
    "revoke",
    "right",
    "rlike",
    "row",
    "rows",
    "row_number",
    "schema",
    "schemas",
    "second_microsecond",
    "select",
    "sensitive",
    "separator",
    "set",
    "show",
    "show",
    "signal",
    "smallint",
    "spatial",
    "specific",
    "sql",
    "sqlexception",
    "sqlstate",
    "sqlwarning",
    "sql_big_result",
    "sql_calc_found_rows",
    "sql_small_result",
    "ssl",
    "starting",
    "stored",
    "straight_join",
    "system",
    "table",
    "terminated",
    "then",
    "tinyblob",
    "tinyint",
    "tinytext",
    "to",
    "trailing",
    "trigger",
    "true",
    "undo",
    "union",
    "unique",
    "unlock",
    "unsigned",
    "update",
    "usage",
    "use",
    "using",
    "utc_date",
    "utc_time",
    "utc_timestamp",
    "values",
    "varbinary",
    "varchar",
    "varcharacter",
    "varying",
    "virtual",
    "when",
    "where",
    "while",
    "window",
    "with",
    "write",
    "xor",
    "year_month",
    "zerofill",
  ].map((word) => word.toLowerCase()),
);

export function quoteIdent(name: string): string {
  const trimmed = name.replace(/\0/g, "").slice(0, 64);
  return `\`${trimmed.replace(/`/g, "``")}\``;
}

export function toMysqlName(raw: string, fallback = "access_db"): string {
  const noExt = raw.replace(/\.(mdb|accdb)$/i, "");
  const cleaned = noExt
    .replace(/[^\p{L}\p{N}_]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return cleaned || fallback;
}

export function uniqueMysqlName(desired: string, used: Set<string>, extra?: string): string {
  const key = desired.toLowerCase();
  if (!used.has(key)) {
    used.add(key);
    return desired;
  }
  const suffix = extra ? `_${extra.replace(/[^\p{L}\p{N}_]+/gu, "")}` : "";
  let candidate = toMysqlName(`${desired}${suffix || "_2"}`);
  let index = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = toMysqlName(`${desired}_${index}`);
    index += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function quoteString(value: string): string {
  return `'${value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x00/g, "")}'`;
}

export function mapColumnType(column: Column): string {
  switch (column.type) {
    case "boolean":
      return "TINYINT(1)";
    case "byte":
      return "TINYINT UNSIGNED";
    case "integer":
      return "SMALLINT";
    case "long":
      return "INT";
    case "bigint":
      return "BIGINT";
    case "currency":
      return "DECIMAL(19,4)";
    case "float":
      return "FLOAT";
    case "double":
      return "DOUBLE";
    case "datetime":
      return "DATETIME";
    case "datetimextended":
      return "DATETIME(6)";
    case "binary":
      return column.size > 255 ? "BLOB" : `VARBINARY(${Math.max(column.size, 1)})`;
    case "text": {
      const chars =
        column.size > 255
          ? Math.min(255, Math.max(1, Math.ceil(column.size / 2)))
          : Math.max(column.size, 1);
      return `VARCHAR(${chars})`;
    }
    case "ole":
      return "LONGBLOB";
    case "memo":
      return "LONGTEXT";
    case "repid":
      return "CHAR(38)";
    case "numeric": {
      const precision = Math.min(Math.max(column.precision ?? 18, 1), 65);
      const scale = Math.min(Math.max(column.scale ?? 0, 0), precision);
      return `DECIMAL(${precision},${scale})`;
    }
    case "complex":
      return "LONGTEXT";
    default:
      return "TEXT";
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function sqlLiteral(value: Value, type: ColumnType): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  switch (type) {
    case "boolean":
      return value ? "1" : "0";
    case "byte":
    case "integer":
    case "long":
    case "float":
    case "double":
      return isFiniteNumber(value) ? String(value) : "NULL";
    case "bigint":
      return typeof value === "bigint" ? value.toString() : "NULL";
    case "currency":
    case "numeric":
      return typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)
        ? value
        : quoteString(String(value));
    case "datetime":
      return value instanceof Date
        ? quoteString(formatDateTime(value))
        : "NULL";
    case "datetimextended":
      return quoteString(String(value));
    case "binary":
    case "ole":
      if (Buffer.isBuffer(value)) {
        return value.length === 0 ? "NULL" : `0x${value.toString("hex")}`;
      }
      return "NULL";
    case "complex":
      if (Array.isArray(value)) {
        return quoteString(
          JSON.stringify(
            value.map((item) => ({
              name: item.name,
              type: item.type,
              data: Buffer.isBuffer(item.data)
                ? item.data.toString("base64")
                : "",
              url: item.url,
              timestamp: item.timestamp
                ? formatDateTime(item.timestamp)
                : undefined,
            })),
          ),
        );
      }
      return "NULL";
    default:
      return quoteString(String(value));
  }
}

function columnDefinitionSql(column: ConvertedColumn): string {
  const parts = [quoteIdent(column.name), column.mysqlType];
  if (column.autoIncrement && (column.mysqlType === "INT" || column.mysqlType === "BIGINT")) {
    parts.push("NOT NULL", "AUTO_INCREMENT");
  } else if (column.primaryKey) {
    parts.push("NOT NULL");
  } else if (!column.nullable) {
    parts.push("NOT NULL");
  } else {
    parts.push("NULL");
  }
  return parts.join(" ");
}

function toConvertedColumn(
  column: Column,
  primaryKeyName: string | null,
): ConvertedColumn {
  const autoIncrement = Boolean(column.autoLong);
  return {
    name: column.name,
    accessType: column.type,
    mysqlType: mapColumnType(column),
    nullable: column.nullable && !autoIncrement,
    autoIncrement,
    primaryKey: primaryKeyName === column.name,
  };
}

function pickPrimaryKey(columns: Column[]): string | null {
  const auto = columns.filter((column) => column.autoLong || column.autoUUID);
  if (auto.length === 1) {
    return auto[0].name;
  }
  return null;
}

function createTableSql(
  tableName: string,
  columns: ConvertedColumn[],
  options: Required<Pick<ConvertOptions, "includeDropTable" | "engine" | "charset" | "collate">>,
): string {
  const lines: string[] = [];
  if (options.includeDropTable) {
    lines.push(`DROP TABLE IF EXISTS ${quoteIdent(tableName)};`);
  }
  const defs = columns.map(columnDefinitionSql);
  const pk = columns.find((column) => column.primaryKey);
  if (pk) {
    defs.push(`PRIMARY KEY (${quoteIdent(pk.name)})`);
  }
  lines.push(`CREATE TABLE ${quoteIdent(tableName)} (`);
  lines.push(defs.map((def) => `  ${def}`).join(",\n"));
  lines.push(
    `) ENGINE=${options.engine} DEFAULT CHARSET=${options.charset} COLLATE=${options.collate};`,
  );
  return lines.join("\n");
}

function insertSql(
  tableName: string,
  columns: ConvertedColumn[],
  rows: Array<Record<string, Value>>,
  batchSize: number,
): string {
  if (rows.length === 0) {
    return "";
  }

  const colList = columns.map((column) => quoteIdent(column.name)).join(", ");
  const chunks: string[] = [];

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const values = batch
      .map((row) => {
        const literals = columns.map((column) =>
          sqlLiteral(row[column.name] ?? null, column.accessType),
        );
        return `(${literals.join(", ")})`;
      })
      .join(",\n  ");
    chunks.push(
      `INSERT INTO ${quoteIdent(tableName)} (${colList}) VALUES\n  ${values};`,
    );
  }

  return chunks.join("\n");
}

export function convertAccessBuffer(
  buffer: Buffer,
  sourceName: string,
  options: ConvertOptions = {},
): ConvertResult {
  const charset = options.charset ?? "utf8mb4";
  const collate = options.collate ?? "utf8mb4_unicode_ci";
  const engine = options.engine ?? "InnoDB";
  const includeCreateDatabase = options.includeCreateDatabase ?? true;
  const includeDropTable = options.includeDropTable ?? true;
  const includeData = options.includeData ?? true;
  const batchSize = Math.max(1, options.batchSize ?? 200);
  const databaseName = toMysqlName(
    options.databaseName || sourceName,
    "access_db",
  );

  const warnings: string[] = [];
  const reader = new MDBReader(buffer, {
    password: options.password || undefined,
  });

  const tableNames = reader.getTableNames({
    normalTables: true,
    systemTables: false,
    linkedTables: false,
  });
  const linkedTables = reader.getTableNames({
    normalTables: false,
    systemTables: false,
    linkedTables: true,
  });
  if (linkedTables.length > 0) {
    warnings.push(
      `已跳过 ${linkedTables.length} 个链接表：${linkedTables.join(", ")}`,
    );
  }

  const tables: ConvertedTable[] = [];
  const sqlParts: string[] = [];
  let totalRows = 0;

  sqlParts.push(`-- Access → MySQL`);
  sqlParts.push(`-- 源文件: ${sourceName.replace(/\r|\n/g, " ")}`);
  sqlParts.push(`-- 生成时间: ${new Date().toISOString()}`);
  sqlParts.push(`-- 表数量: ${tableNames.length}`);
  sqlParts.push("");
  sqlParts.push("/*!40101 SET NAMES utf8mb4 */;");
  sqlParts.push("/*!40101 SET FOREIGN_KEY_CHECKS=0 */;");
  sqlParts.push("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';");
  sqlParts.push("");

  if (includeCreateDatabase) {
    sqlParts.push(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdent(databaseName)} DEFAULT CHARACTER SET ${charset} COLLATE ${collate};`,
    );
    sqlParts.push(`USE ${quoteIdent(databaseName)};`);
    sqlParts.push("");
  }

  for (const tableName of tableNames) {
    const tableWarnings: string[] = [];
    try {
      const table = reader.getTable(tableName);
      const accessColumns = table.getColumns();
      const primaryKeyName = pickPrimaryKey(accessColumns);
      const columns = accessColumns.map((column) =>
        toConvertedColumn(column, primaryKeyName),
      );

      if (tableName.length > 64) {
        tableWarnings.push(`表名超过 64 个字符，已截断`);
      }
      for (const column of columns) {
        if (MYSQL_RESERVED.has(column.name.toLowerCase())) {
          tableWarnings.push(
            `列 ${column.name} 是 MySQL 保留字，已用反引号转义`,
          );
        }
      }

      sqlParts.push(`-- 表: ${tableName} (${table.rowCount} 行)`);
      sqlParts.push(
        createTableSql(tableName, columns, {
          includeDropTable,
          engine,
          charset,
          collate,
        }),
      );
      sqlParts.push("");

      if (includeData && table.rowCount > 0) {
        const rows = table.getData();
        const inserts = insertSql(tableName, columns, rows, batchSize);
        if (inserts) {
          sqlParts.push(inserts);
          sqlParts.push("");
        }
      }

      totalRows += table.rowCount;
      tables.push({
        name: tableName,
        rowCount: table.rowCount,
        columns,
        warnings: tableWarnings,
      });
      warnings.push(...tableWarnings.map((warning) => `[${tableName}] ${warning}`));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "读取表失败";
      warnings.push(`无法转换表 ${tableName}: ${message}`);
      tables.push({
        name: tableName,
        rowCount: 0,
        columns: [],
        warnings: [message],
      });
    }
  }

  sqlParts.push("/*!40101 SET FOREIGN_KEY_CHECKS=1 */;");
  sqlParts.push("");

  return {
    sourceName,
    databaseName,
    tableCount: tables.length,
    rowCount: totalRows,
    tables,
    warnings,
    sql: sqlParts.join("\n"),
  };
}

export function isAccessFileName(name: string): boolean {
  return /\.(mdb|accdb)$/i.test(name);
}
