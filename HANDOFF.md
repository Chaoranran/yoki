# 又记 (Yoki) — Handoff 文档

生成时间：2026-05-12

## 项目状态

又记是一个纯前端的个人书影音记录 + Markdown 笔记 + 电子书架工具。素材管理（gallery）已废弃，书架功能（bookshelf）已完成。

### 已发布功能
- 书影音记录的增删改查
- **JSONL 本地存储**：记录保存在笔记文件夹的 `records.jsonl`，可备份、可迁移
- Markdown 笔记编辑（Milkdown）+ 文件管理
- 统计页、热力图、搜索
- 回收站（带批量操作）
- 深色/浅色主题切换
- 想法/金句/书摘同步到笔记
- Markdown 导出（设置页）
- **电子书架**：扫描 EPUB/PDF，封面提取，搜索排序，阅读状态同步，封面自动填充

### 开发中的功能
- 无

---

## 电子书架（bookshelf）

### 完成的功能
- 文件夹选择 + 扫描（递归遍历 epub/pdf）
- JSZip CDN 解压 + OPF XML 解析
- 书名/作者/封面提取（支持多种封面命名策略）
- 封面缩略图（`createImageBitmap` + Canvas，300px JPEG）
- IndexedDB 封面缓存
- 响应式网格：1280px→7列，1536px→8列
- 占位封面（无封面时显示首字符）
- 点击封面通过系统默认程序打开
- 侧边栏导航已替换（素材→书架）
- **搜索**：按书名/作者/文件名实时过滤
- **排序**：按钮式切换，支持名称/类型/修改时间，升降序切换
- 扫描时记录 `lastModified`，支持按修改时间排序
- **阅读状态**：封面右上角显示想看/在看/已看/未标记徽章，与记录同步
- **状态筛选**：与排序同行，支持全部/想看/在看/已看/未标记
- **添加记录入口**：无记录的书卡片显示「+ 添加记录」，预填跳转
- **封面自动填充**：添加书籍时从书架匹配封面（部分匹配 + 字符重叠模糊匹配）

### DB 层
- `DB_VERSION` 5 → 6，新增 `bookshelf` store（keyPath: 'path'）
- `saveBookshelfFolderHandle` / `getBookshelfFolderHandle`
- `saveBookCache` / `loadAllBookCache` / `clearBookCache`

### 数据存储
- **JSONL 模式**（推荐）：连接笔记文件夹后，记录自动保存到 `records.jsonl`
  - 增量写入：新增记录追加到文件末尾
  - 全量重写：编辑/删除时重写整个文件
  - 自动迁移：首次连接时从 IndexedDB 迁移数据
  - 损坏回退：JSONL 损坏时自动使用 IndexedDB 缓存并提示用户
- **IndexedDB 模式**：未连接文件夹时，记录保存在浏览器 IndexedDB

---

## 未提交的改动

- 更新 HANDOFF.md 记录书架集成与数据统一完成

---

## 最近完成

### 2026-05-12 书架集成与数据统一
- ✅ common.js: 新增 normalizeTitle / isMatch（含字符重叠模糊匹配）
- ✅ db.js: loadRecords 统一入口——JSONL 优先，缓存 IndexedDB，自动回退
- ✅ add.html: 封面自动填充（blur 匹配 + 缓存就绪 + 提示 UI）+ URL 预填跳转回书架
- ✅ bookshelf.html: 阅读状态徽章 + 状态筛选栏 + 添加记录入口
- ✅ 修复：权限弹窗阻塞事件绑定、多行排序残留、isMatch 文法错误导致的页面崩溃

### 2026-05-12 JSONL 本地存储迁移
- ✅ db.js: 新增 5 个 JSONL 操作函数
- ✅ index.html: 启动时检测 JSONL，支持自动迁移和损坏回退
- ✅ add.html: 增删改操作同步到 JSONL
- ✅ 界面优化: 移除侧边栏导入导出，MD 导出移到设置页
- ✅ 所有页面: 更新 favicon 为透明图标

---

## 已知的用户偏好（需牢记）

1. **必须先测试再让用户测试**
2. **主动建议更优方案**
3. **中文沟通**
4. **不改动已稳定的功能**
5. **不自动提交或推送代码**
6. **不改动 Milkdown ESM 引入方式**
7. **回复简洁直接**
8. **改视觉/交互方式先问用户**
9. **执行前确认完整范围，列 checklist**
10. **复杂改动先讨论方案，简单调整直接做，修改超过3个文件时先拆成小任务**
11. **改代码前先跑现有测试确认基线**

---

## 技术决策

| 决策 | 选择 |
|------|------|
| EPUB 解析 | JSZip CDN（3.10.1） |
| 封面缩略图 | `createImageBitmap` + Canvas + JPEG 0.85 |
| 封面缓存 | IndexedDB bookshelf store，base64 存 |
| 封面检测 | 优先 cover/front 关键词 → 第一张图片 |
| 书架网格 | CSS grid，响应式 2~8 列 |
| DB 版本 | 6（增加 bookshelf store） |
| 排序 UI | 按钮式 + 箭头指示升降序（同 gallery 风格） |
| 素材页 | gallery.html 已删除（git 历史中保留） |
| 书影音存储 | JSONL 文件（优先）/ IndexedDB（回退） |
| JSONL 格式 | 每行一条 JSON，行尾 `\n` |
| 写入策略 | 新增追加，编辑/删除重写 |
| 记录加载 | 统一入口 `loadRecords()`：优先 JSONL，缓存 IndexedDB，自动回退 |
| 书名匹配 | 标准化去标点 → 双向包含 → Jaccard 字符重叠 ≥ 0.65 |
| 状态徽章 | Map<normalizedTitle, status> O(1) + `isMatch` 遍历兜底 |

---

## 启动方式

```bash
cd D:/app/Vibe Coding/YoKi
python -m http.server 8767
# http://127.0.0.1:8767/bookshelf.html
```
