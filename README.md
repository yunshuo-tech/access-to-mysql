# Access 转 MySQL

**版本：** v1.0.1  
**开发者：** Hangzhou Yunshuo Technology Co., Ltd.（杭州云硕科技有限公司）

把 Microsoft Access（`.mdb` / `.accdb`）转成可直接导入的 MySQL SQL 脚本。提供网页上传转换和命令行批量转换两种用法。

文件只在本次转换时处理，不会保存到服务器。窗体、报表、宏、VBA 不会转换，只导出表结构和数据。

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

## 运行

### 开发模式

用于本地调试，修改代码后会自动刷新：

```bash
npm run dev
```

浏览器打开：

```text
http://127.0.0.1:43180
```

### 生产部署

先构建，再启动正式服务：

```bash
npm run build
npm start
```

默认监听 **43180** 端口。启动成功后访问：

```text
http://127.0.0.1:43180
```

服务需保持运行。进程退出后网页将无法访问。

### 后台常驻（可选）

Windows 可用任务计划程序或 NSSM 将 `npm start` 注册为服务。Linux / macOS 可用 systemd 或 PM2：

```bash
npm install -g pm2
npm run build
pm2 start npm --name access-to-mysql -- start
pm2 save
```

如需通过 Nginx 反向代理，注意上传体积（本项目允许最大约 256 MB）：

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

### 阿里云宝塔面板部署

适合在阿里云 ECS（或其他 Linux 云主机）上用宝塔面板部署本项目。网页转换本身不依赖 MySQL；只有导入生成的 `.sql` 时才需要数据库。

#### 1. 安装软件

在宝塔「软件商店」安装：

- **Nginx**
- **PM2 管理器**（或自行安装 PM2）
- **Node 版本管理器**，并安装 **Node.js 20.9 或更高**

确认：

```bash
node -v
npm -v
```

#### 2. 上传项目

将项目放到服务器，例如：

```text
/www/wwwroot/access-to-mysql
```

可用宝塔「文件」上传压缩包后解压，或用 `git clone`。

#### 3. 安装依赖并构建

在宝塔「终端」或 SSH 中执行：

```bash
cd /www/wwwroot/access-to-mysql
npm install
npm run build
```

#### 4. 用 PM2 常驻启动

```bash
cd /www/wwwroot/access-to-mysql
pm2 start npm --name access-to-mysql -- start
pm2 save
pm2 startup
```

也可在宝塔「PM2 管理器」中添加项目，运行目录指向项目路径，启动命令使用 `npm start`，端口为 **43180**。

先在本机验证服务已启动：

```text
http://127.0.0.1:43180
```

#### 5. 添加网站并配置反向代理

1. 宝塔 → **网站** → 添加站点，绑定你的域名（根目录可任意，实际由反向代理转发）
2. 站点设置 → **反向代理** → 添加，目标 URL 填：

```text
http://127.0.0.1:43180
```

3. 打开该站点的 Nginx 配置，确保包含上传体积与超时设置（本项目允许最大约 256 MB，转换最长约 120 秒）：

```nginx
client_max_body_size 256m;

location / {
    proxy_pass http://127.0.0.1:43180;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
}
```

保存后重载 Nginx。

#### 6. SSL 与安全组

- 站点设置 → **SSL**：申请 Let’s Encrypt，可开启强制 HTTPS
- 阿里云安全组与宝塔防火墙：**对外只开放 80 / 443**
- **不要把 43180 对公网开放**，仅供本机 Nginx 反向代理访问

#### 7. 更新代码

```bash
cd /www/wwwroot/access-to-mysql
# git pull 或重新上传代码后：
npm install
npm run build
pm2 restart access-to-mysql
```

#### 常见问题

| 现象 | 处理 |
| --- | --- |
| 上传大文件失败 | 检查 Nginx 是否设置 `client_max_body_size 256m` |
| 转换超时 / 504 | 加大 `proxy_read_timeout`、`proxy_send_timeout` |
| 访问 502 | 检查 PM2 中 `access-to-mysql` 是否在运行，端口是否为 `43180` |
| Node 报错或无法启动 | 确认 Node.js ≥ 20.9 |

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

网页运行在远程环境时，**无法直接读取你电脑上的本地磁盘**（例如 `D:\Users\Desktop\ACCESS`）。请把文件上传到网页，或改用下面的命令行。

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
