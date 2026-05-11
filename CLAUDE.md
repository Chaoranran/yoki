# 又记 (Yoki)

本地优先的个人书影音记录 + Markdown 笔记工具。

## 技术栈

- 纯前端：HTML + Vanilla JS + Tailwind CSS (CDN) + 少量手写 CSS
- 编辑器：Milkdown v7.17.2（通过 `import('https://esm.sh/...')` 加载）
- 存储：IndexedDB（书影音记录）+ File System Access API（.md 笔记文件）
- 主题：Tailwind `class` 策略 + CSS 变量，支持深色/浅色切换
- GitHub Pages：https://chaoranran.github.io/yoki/

## 项目文件

```
/index.html          — 记录页（书影音浏览/搜索/筛选）
/add.html             — 添加/编辑记录
/notes.html           — 笔记页（Markdown 编辑器 + 列表）
/dashboard.html       — 统计页
/heatmap.html         — 热力图
/search.html          — 搜索
/settings.html        — 设置
/common.js            — 公共工具（主题、导入导出、右键菜单）
/db.js                — IndexedDB 数据层
/notes-common.js      — 笔记工具函数
/components/sidebar.js — 侧边栏组件
/components/icons.js   — SVG 图标
/styles/theme.css     — 主题 CSS 变量
```

## 约定

- 所有 UI 文字、注释使用中文
- 代码标识符（变量名、函数名）、commit message 用英文
- 不引入额外框架或后端依赖
- 数据存储用 IndexedDB + localStorage（偏好设置）
- 移动端 <768px 保持现有响应式逻辑
- 不更改 Milkdown ESM 引入方式
- 右键菜单用 common.js 的 `createContextMenu` 组件

## 常用命令

```bash
python -m http.server 8767    # 启动开发服务器
```

## 设计原则

安静、克制、不冗余。数据完全归用户所有，不上传任何服务器。

## 沟通

- 中文沟通
- 回复简洁直接，不要过度解释
- 发现更优路径时主动建议，不只按指令做

## 工作习惯

- 复杂改动先讨论方案，简单调整直接做
修改超过3个文件时先拆成小任务
- 改代码前先跑现有测试确认基线

## 边界

- 不要自动提交或推送代码
- 不要添加新依赖未经确认
- 不要在代码中硬编译密钥和密码
