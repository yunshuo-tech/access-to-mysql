import assert from "node:assert/strict";

import {
  formatDateTime,
  mapColumnType,
  quoteIdent,
  quoteString,
  sqlLiteral,
  uniqueMysqlName,
  toMysqlName,
} from "../src/lib/access-to-mysql";

function run() {
  assert.equal(quoteIdent("库存"), "`库存`");
  assert.equal(quoteIdent("a`b"), "`a``b`");
  assert.equal(toMysqlName("库存管理.mdb"), "库存管理");
  assert.equal(toMysqlName("my db.accdb"), "my_db");
  {
    const used = new Set<string>();
    assert.equal(uniqueMysqlName("test", used, "mdb"), "test");
    assert.equal(uniqueMysqlName("test", used, "accdb"), "test_accdb");
  }
  assert.equal(quoteString("O'Hara"), "'O\\'Hara'");
  assert.equal(sqlLiteral(true, "boolean"), "1");
  assert.equal(sqlLiteral(null, "text"), "NULL");
  assert.equal(sqlLiteral(12.5, "double"), "12.5");
  assert.equal(sqlLiteral(BigInt(42), "bigint"), "42");
  assert.equal(
    sqlLiteral(new Date(2024, 0, 2, 3, 4, 5), "datetime"),
    quoteString(formatDateTime(new Date(2024, 0, 2, 3, 4, 5))),
  );
  assert.equal(
    mapColumnType({
      name: "id",
      type: "long",
      size: 4,
      fixedLength: true,
      nullable: false,
      autoLong: true,
      autoUUID: false,
    }),
    "INT",
  );
  assert.equal(
    mapColumnType({
      name: "memo",
      type: "memo",
      size: 0,
      fixedLength: false,
      nullable: true,
      autoLong: false,
      autoUUID: false,
    }),
    "LONGTEXT",
  );
  console.log("self-test ok");
}

run();
