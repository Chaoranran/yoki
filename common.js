/*
 * common.js — 又记公共工具库
 *
 * API 清单：
 *   escapeHtml(str)              — 转义 HTML 特殊字符 (& < >)，防止 XSS
 *   escapeAttr(str)              — 转义 HTML 属性值 (& < > ")，防止属性注入
 *   applyTheme()                 — 根据 localStorage 应用深色/浅色主题
 *   toggleTheme()                — 切换深色/浅色主题并持久化
 *   initThemeEvents()            — 绑定主题切换按钮点击事件
 *   exportData(data)             — 将数据导出为 JSON 文件下载
 *   importData(file, callback)   — 读取 JSON 文件并回调解析结果
 *   bindImportExport(getFn, setFn) — 绑定导入/导出按钮事件
 *   initPage(activePage, loadFn, saveFn) — 页面初始化一站式入口
 */

function escapeHtml(str) {
    if (str == null) return '';
    str = String(str);
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function escapeAttr(str) {
    if (str == null) return '';
    str = String(str);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function applyTheme() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.documentElement.classList.add('dark');
    }
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn && typeof iconThemeSidebar === 'function') {
        toggleBtn.innerHTML = iconThemeSidebar(darkMode);
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn && typeof iconThemeSidebar === 'function') {
        toggleBtn.innerHTML = iconThemeSidebar(isDark);
    }
}

function initThemeEvents() {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', toggleTheme);
}

function exportData(data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `又记备份_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) throw new Error('格式错误：需要 JSON 数组');
            if (confirm(`确定要导入 ${imported.length} 条记录吗？\n现有数据将被完全覆盖。`)) {
                callback(imported);
            }
        } catch (err) {
            alert('导入失败：' + err.message);
        }
    };
    reader.readAsText(file);
}

function bindImportExport(getDataFn, setDataFn) {
    const exportBtn = document.getElementById('exportBtn');
    const importFile = document.getElementById('importFile');

    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const data = await getDataFn();
            exportData(data);
        });
    }

    if (importFile) {
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            importData(file, async (imported) => {
                await setDataFn(imported);
                alert('导入成功！即将刷新页面。');
                location.reload();
            });
            e.target.value = '';
        });
    }
}

function initPage(activePage, loadFn, saveFn) {
    document.getElementById('sidebar-container').innerHTML = renderSidebar(activePage);
    applyTheme();
    initThemeEvents();
    if (loadFn && saveFn) {
        bindImportExport(loadFn, saveFn);
    }
}

/* ── 书名匹配（书架集成用） ── */
function normalizeTitle(title) {
    return String(title)
        .toLowerCase()
        .replace(/[\s:：;；,，.。!！?？""''【】《》『』（）()、·…—–\-]+/g, '')
        .trim();
}

function isMatch(inputTitle, bookTitle) {
    const input = normalizeTitle(inputTitle);
    const book = normalizeTitle(bookTitle);
    if (!input || !book) return false;
    if (book.includes(input) || input.includes(book)) return true;
    // 模糊匹配：字符重叠度（双方至少3个字）
    if (input.length >= 3 && book.length >= 3) {
        const setA = new Set(input);
        const setB = new Set(book);
        const inter = new Set([...setA].filter(c => setB.has(c)));
        const union = new Set([...setA, ...setB]);
        if (inter.size / union.size >= 0.65) return true;
    }
    return false;
}

/* ── 右键菜单（通用组件） ── */
function createContextMenu(items, event) {
    event.preventDefault();
    const existing = document.getElementById('contextMenu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'contextMenu';
    menu.className = 'fixed z-[99999] bg-white dark:bg-[#262932] rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 min-w-[140px] text-sm';
    menu.style.display = 'none';

    items.forEach((item, idx) => {
        if (item.separator) {
            const sep = document.createElement('div');
            sep.className = 'border-t border-gray-200 dark:border-gray-600 my-1';
            menu.appendChild(sep);
            return;
        }
        const btn = document.createElement('button');
        btn.className = 'w-full text-left px-3 py-1.5 whitespace-nowrap flex items-center gap-2 transition-colors';
        if (item.danger) {
            btn.classList.add('text-[#C88B8B]', 'hover:bg-red-50', 'dark:hover:bg-red-900/20');
        } else {
            btn.classList.add('text-gray-700', 'dark:text-gray-200', 'hover:bg-indigo-50', 'dark:hover:bg-indigo-900/20');
        }
        if (item.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'flex-shrink-0 w-4 h-4 flex items-center';
            iconSpan.innerHTML = item.icon;
            btn.appendChild(iconSpan);
        }
        const labelSpan = document.createElement('span');
        labelSpan.textContent = item.label;
        btn.appendChild(labelSpan);
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
                if (item.action) item.action();
            } catch (err) {
                console.error('右键菜单操作失败:', err);
            }
            closeContextMenu();
        });
        btn.addEventListener('mousedown', (e) => e.stopPropagation());
        menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    menu.style.display = 'block';
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = event.clientX;
    let y = event.clientY;

    if (x + rect.width > vw - 10) x = Math.max(10, vw - rect.width - 10);
    if (y + rect.height > vh - 10) y = Math.max(10, vh - rect.height - 10);

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    document.addEventListener('click', closeContextMenuOnClick, true);
    document.addEventListener('keydown', closeContextMenuOnEsc);
}

function closeContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.remove();
    document.removeEventListener('click', closeContextMenuOnClick, true);
    document.removeEventListener('keydown', closeContextMenuOnEsc);
}

function closeContextMenuOnClick(e) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    if (!menu.contains(e.target)) closeContextMenu();
}

function closeContextMenuOnEsc(e) {
    if (e.key === 'Escape') closeContextMenu();
}

window.createContextMenu = createContextMenu;
window.closeContextMenu = closeContextMenu;
window.closeContextMenuOnClick = closeContextMenuOnClick;
window.closeContextMenuOnEsc = closeContextMenuOnEsc;

/* ── 文档级右键菜单注册表（解决模块脚本中事件绑定问题） ── */
const _contextMenuRegistry = [];

function registerContextMenu(selector, getItems) {
    _contextMenuRegistry.push({ selector, getItems });
}

function _handleContextMenu(e) {
    for (const reg of _contextMenuRegistry) {
        const target = e.target.closest(reg.selector);
        if (target) {
            e.preventDefault();
            e.stopPropagation();
            const items = reg.getItems(target);
            if (items && items.length > 0) {
                window.createContextMenu(items, e);
            }
            break;
        }
    }
}
document.addEventListener('contextmenu', _handleContextMenu, true);

window.registerContextMenu = registerContextMenu;

document.addEventListener('DOMContentLoaded', applyTheme);
