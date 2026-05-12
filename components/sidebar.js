function renderSidebar(activePage) {
    const navItems = [
        { id: 'notes',     href: 'notes.html',     label: '笔记', icon: iconNotes },
        { id: 'index',     href: 'index.html',     label: '记录', icon: iconRecords },
        { id: 'add',       href: 'add.html',       label: '添加', icon: iconAdd },
        { id: 'bookshelf', href: 'bookshelf.html', label: '书架', icon: iconBookshelf },
        { id: 'search',    href: 'search.html',    label: '搜索', icon: iconSearchSidebar },
        { id: 'dashboard', href: 'dashboard.html', label: '统计', icon: iconDashboard },
        { id: 'heatmap',   href: 'heatmap.html',   label: '热力图', icon: iconHeatmap },
        { id: 'settings',  href: 'settings.html',  label: '设置', icon: iconSettingsSidebar },
    ];

    const navLinks = navItems.map(item => {
        const isActive = item.id === activePage;
        const baseClasses = 'px-1 py-3 rounded-md flex justify-center items-center';
        const activeClasses = 'bg-indigo-600 text-white';
        const inactiveClasses = 'text-gray-500 hover:bg-gray-200 hover:text-gray-700';
        const classes = isActive
            ? `${baseClasses} ${activeClasses}`
            : `${baseClasses} ${inactiveClasses}`;
        return `<a href="${item.href}" class="${classes}" title="${item.label}">${item.icon()}</a>`;
    }).join('\n            ');

    return `
    <style>
        .sidebar-nav a { position: relative; }
        .sidebar-nav a::after {
            content: attr(title);
            position: absolute;
            left: calc(100% + 8px);
            top: 50%;
            transform: translateY(-50%);
            background: #374151;
            color: #fff;
            font-size: 0.75rem;
            padding: 2px 8px;
            border-radius: 4px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s;
            z-index: 99999;
        }
        .sidebar-nav a:hover::after {
            opacity: 1;
            transition-delay: 300ms;
        }
    </style>
    <nav class="sidebar-nav w-16 shadow-md px-2 py-3 flex flex-col gap-1 fixed h-screen bg-white dark:bg-[#1e1e24] z-50">
        ${navLinks}
        <div class="mt-auto flex flex-col gap-1 items-center">
            <label class="p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 rounded-md cursor-pointer flex justify-center items-center" title="导入">
                ${iconImportSidebar()}
                <input type="file" id="importFile" accept=".json" class="hidden">
            </label>
            <button id="exportBtn" class="p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 rounded-md flex justify-center items-center" title="导出">${iconExportSidebar('w-5 h-5')}</button>
            <button id="themeToggle" class="p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 rounded-md flex justify-center items-center" title="切换主题">${iconThemeSidebar()}</button>
        </div>
    </nav>`;
}

/* ── 侧边栏图标（自包含，不依赖 icons.js） ── */
function iconNotes() {
    return `<svg class="w-5 h-5" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4h12v14H4z"/><path d="M7 8h6M7 11h6M7 14h4"/></svg>`;
}
function iconRecords() {
    return `<svg class="w-5 h-5" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="16" height="16" rx="2"/><path d="M7 2v16M13 2v16"/></svg>`;
}
function iconBookshelf() {
    return `<svg class="w-5 h-5" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="3" y="3" width="4" height="14" rx="1"/><rect x="13" y="3" width="4" height="14" rx="1"/><path d="M7 7h6M7 11h6M7 15h6"/></svg>`;
}
function iconAdd() {
    return `<svg class="w-5 h-5" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="8"/><path stroke-linecap="round" d="M10 6v8M6 10h8"/></svg>`;
}
function iconSearchSidebar() {
    return `<svg class="w-5 h-5" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m19 19-4.35-4.35M17 9A8 8 0 1 0 1 9a8 8 0 0 0 16 0Z"/></svg>`;
}
function iconDashboard() {
    return `<svg class="w-5 h-5" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 10h4l3-8 4 16 3-8h4"/></svg>`;
}
function iconHeatmap() {
    return `<svg class="w-5 h-5" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="7" height="7" rx="1"/><rect x="11" y="2" width="7" height="7" rx="1"/><rect x="2" y="11" width="7" height="7" rx="1"/><rect x="11" y="11" width="7" height="7" rx="1"/></svg>`;
}
function iconSettingsSidebar() {
    return `<svg class="w-5 h-5" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><polygon points="10,2 17,6 17,14 10,18 3,14 3,6"/><circle cx="10" cy="10" r="3.5"/></svg>`;
}
function iconImportSidebar() {
    return `<svg class="w-5 h-5" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 3v10m0 0-3-3m3 3 3-3"/><path d="M4 14v3h12v-3"/></svg>`;
}
function iconExportSidebar(cls) {
    return `<svg class="${cls || 'w-5 h-5'}" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 12V3m0 0L7 5.5M10 3l3 2.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M4 11v4a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4"/></svg>`;
}
function iconThemeSidebar(isDark) {
    if (isDark === undefined) isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        return `<svg class="w-5 h-5" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41"/></svg>`;
    }
    return `<svg class="w-5 h-5" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 10.74A7 7 0 1 1 9.26 3 5.5 5.5 0 0 0 17 10.74z"/></svg>`;
}
