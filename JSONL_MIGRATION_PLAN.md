# JSONL 本地存储迁移 — 开发计划

## 背景

书影音记录目前存储在浏览器 IndexedDB 中，用户无法直接查看和备份。迁移后记录以 `records.jsonl` 文件存放在笔记文件夹中，和笔记文件一样可见、可备份。

## 总览

| 阶段 | 内容 | 难度 | 涉及文件 | 估值 |
|------|------|------|----------|------|
| 一 | db.js 新增 JSONL 读写层 | ⭐⭐ | db.js | ~1h |
| 二 | 集成到记录页 | ⭐⭐⭐ | index.html, add.html | ~1.5h |
| 三 | 兼容性兜底 | ⭐ | db.js, index.html | ~30min |

---

## 阶段一：db.js 新增 JSONL 读写层

### 函数清单

| 函数 | 说明 |
|------|------|
| `ensureRecordsJSONL()` | 扫描笔记文件夹，若没有 records.jsonl 则自动创建空文件 |
| `loadRecordsFromJSONL()` | 读取 records.jsonl，按行解析 JSON 返回数组 |
| `appendRecordToJSONL(record)` | 将新记录追加到文件末尾（增量写入） |
| `rewriteRecordsJSONL(records)` | 全量重写整个 JSONL 文件（修改/删除时用） |
| `migrateFromIndexedDBToJSONL()` | 将 IndexedDB 所有记录写入 JSONL，迁移后清理 IndexedDB |

### 关键设计
- JSONL 格式：每行一条 JSON，行尾 `\n`
- 使用 File System Access API 读写文件（`createWritable`）
- 所有函数通过笔记文件夹句柄（全局缓存）操作
- 写入失败时不破坏原始数据

---

## 阶段二：集成到记录页

### index.html 改动
- `init()` 启动时检测笔记文件夹是否已连接
- 已连接 → 检查 records.jsonl 是否存在 → 加载 / 迁移
- 未连接 → 保持现有 IndexedDB 逻辑不变
- 增删改操作：优先写 JSONL，同步更新 IndexedDB 缓存
- 搜索/筛选/统计等只读操作：从 IndexedDB 缓存读取（性能）

### add.html 改动
- 新增/编辑保存时判定当前存储模式
- JSONL 模式 → 调用 JSONL 写入函数 + 同步 IndexedDB

---

## 阶段三：兼容性兜底

### 边界情况
- **未连接笔记文件夹**：回退 IndexedDB，现有逻辑不变
- **迁移失败**：保留 IndexedDB 原始数据，不强制覆盖
- **JSONL 文件损坏**：报错提示，回退到 IndexedDB 缓存
- **换设备迁移**：复制整个文件夹 → 连接后自动重建 IndexedDB 缓存

### 导入/导出
- 设置页导出按钮仍然可用，作为额外备份手段
- JSONL 模式下导出 = 读取 JSONL 文件内容
