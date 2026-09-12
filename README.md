# Access 转 MySQL

**版本：** v1.0.2  
**开发者：** Hangzhou Yunshuo Technology Co., Ltd.（杭州云硕科技有限公司）

把 Microsoft Access（`.mdb` / `.accdb`）转成可直接导入的 MySQL SQL 脚本。提供网页上传转换和命令行批量转换两种用法。

文件只在本次转换时处理，不会保存到服务器。窗体、报表、宏、VBA 不会转换，只导出表结构和数据。

**建议优先在本机部署与测试。** 通过网页端上传过大的 Access 文件时，转换会占用较多内存与 CPU，可能拖慢甚至拖住服务器进程；大文件、批量转换请使用本机网页或命令行。

---

## 环境要求

- [Node.js](https://nodejs.org/) **20.9 或更高**（含 npm）
- 本机已安装 MySQL 5.7 / 8.x（仅导入 SQL 时需要）
- Windows / macOS / Linux 均可

确认环境：

```bash
node -v
npm -v
```

---

## 安装

在项目根目录执行：

```bash
npm install
```

---

## 本地部署（推荐）

适合开发调试、日常转换和大文件场景，转换压力落在本机，不影响远程服务器。

### 1. 安装依赖

```bash
cd access-to-mysql
npm install
```

### 2. 开发模式（热更新）

```bash
npm run dev
```

浏览器打开：

```text
http://127.0.0.1:43180
```

### 3. 本机生产模式（可选）

需要更接近正式运行环境时：

```bash
npm run build
npm start
```

同样访问 `http://127.0.0.1:43180`。服务需保持运行；进程退出后网页将无法访问。

### 4. 本机命令行转换（大文件 / 批量推荐）

无需打开浏览器，适合目录批量转换：

```bash
npm run convert -- "D:\Users\Desktop\ACCESS" -o .\mysql-sql
```

### Windows 后台常驻（可选）

可用任务计划程序或 NSSM 将 `npm start` 注册为服务。Linux / macOS 可用 systemd 或 PM2：

```bash
npm install -g pm2
npm run build
pm2 start npm --name access-to-mysql -- start
pm2 save
```

如需通过 Nginx 反向代理本机服务，注意上传体积（本项目允许最大约 256 MB）：

```nginx
server {
    listen 80;
    server_name example.com;

    client_max_body_size 256m;

    location / {
        proxy_pass http://127.0.0.1:43180;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
    }
}
```

---

## 网页使用

1. 打开 http://127.0.0.1:43180
2. 拖入、选择 `.mdb` / `.accdb` 文件，或选择整个文件夹
3. 按需填写选项：
   - **目标数据库名**：可空，默认使用文件名
   - **数据库密码**：Access 未加密可留空
   - **生成 CREATE DATABASE / USE**：导入时自动建库
   - **导入前 DROP TABLE IF EXISTS**：覆盖已有同名表
   - **导出表数据（INSERT）**：取消勾选则只导出表结构
4. 点击 **生成 MySQL 脚本**
5. 下载生成的 `.sql`，再导入 MySQL

网页运行在远程环境时，**无法直接读取你电脑上的本地磁盘**（例如 `D:\Users\Desktop\ACCESS`）。请把文件上传到网页，或改用下面的命令行。文件较大时，请优先本机部署或命令行转换，避免占用远程服务器进程。

---

## 命令行使用

适合本机批量转换整个文件夹，无需打开浏览器。

把整个目录转成 SQL：

```bash
npm run convert -- "D:\Users\Desktop\ACCESS" -o .\mysql-sql
```

转换单个文件：

```bash
npm run convert -- .\库存.mdb -o .\mysql-sql
```

指定目标库名、密码，或只导出结构：

```bash
npm run convert -- .\库存.mdb -o .\mysql-sql --db inventory
npm run convert -- .\加密库.mdb -o .\mysql-sql --password 你的密码
npm run convert -- "D:\Users\Desktop\ACCESS" -o .\mysql-sql --no-data
```

全部选项：

| 选项 | 说明 |
| --- | --- |
| `-o`, `--out DIR` | 输出目录，默认 `./mysql-sql` |
| `--db NAME` | 目标数据库名（仅单文件时生效） |
| `--password PASS` | Access 数据库密码 |
| `--no-create-db` | 不生成 `CREATE DATABASE` |
| `--no-drop` | 不生成 `DROP TABLE` |
| `--no-data` | 只导出表结构 |
| `-h`, `--help` | 显示帮助 |

每个 Access 文件会生成一份同名 `.sql`。

---

## 导入 MySQL

命令行：

```bash
mysql -u root -p < mysql-sql/库存管理.sql
```

也可在 MySQL Workbench、Navicat 等客户端中打开脚本执行。

脚本默认：

- 字符集 `utf8mb4`，排序规则 `utf8mb4_unicode_ci`（中文可导入）
- 存储引擎 `InnoDB`
- 为 Access 的自动编号列生成 `AUTO_INCREMENT` 主键
- 跳过系统表和链接表

---

## 类型对照

| Access | MySQL |
| --- | --- |
| Yes/No | `TINYINT(1)` |
| Byte | `TINYINT UNSIGNED` |
| Integer | `SMALLINT` |
| Long Integer / AutoNumber | `INT` / `INT AUTO_INCREMENT` |
| Currency | `DECIMAL(19,4)` |
| Single / Double | `FLOAT` / `DOUBLE` |
| Date/Time | `DATETIME` |
| Text | `VARCHAR` |
| Memo | `LONGTEXT` |
| OLE Object | `LONGBLOB` |
| Numeric | `DECIMAL` |
| Replication ID | `CHAR(38)` |

---

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器（端口 43180） |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务（端口 43180） |
| `npm run convert -- <路径>` | 命令行转换 |
| `npm run self-test` | 运行内置转换自检 |
| `npm run lint` | 代码检查 |

---

Copyright © 2026 Hangzhou Yunshuo Technology Co., Ltd.（杭州云硕科技有限公司）
