function parseNoteTags(content) {
    const firstLine = content.split('\n')[0] || '';
    if (firstLine.startsWith('tags:')) {
        return firstLine.slice(5).split(/[,，]/).map(t => t.trim()).filter(t => t);
    }
    return [];
}

function parseNoteSource(content) {
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.startsWith('source:')) {
            return line.slice(7).trim();
        }
        if (!line.startsWith('tags:') && line.trim() !== '') {
            break;
        }
    }
    return '';
}

function parseAllNoteSources(content) {
    const sources = [];
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.startsWith('source:')) {
            sources.push(line.slice(7).trim());
        }
    }
    return sources;
}

function stripNoteMetaLines(content) {
    const lines = content.split('\n');
    let start = 0;
    while (start < lines.length) {
        const line = lines[start].trim();
        if (line.startsWith('tags:') || line.startsWith('source:') || line === '') {
            start++;
        } else {
            break;
        }
    }
    return lines.slice(start).join('\n');
}

async function scanNotesFolder(folderHandle) {
    if (!folderHandle) return [];
    const files = [];
    try {
        for await (const entry of folderHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                try {
                    const file = await entry.getFile();
                    const isPinned = entry.name.startsWith('!');
                    const content = await file.text();
                    const allSources = parseAllNoteSources(content);
                    const baseBodyText = stripNoteMetaLines(content);
                    if (allSources.length > 1) {
                        for (let s = 0; s < allSources.length; s++) {
                            const srcVal = allSources[s];
                            files.push({
                                name: entry.name,
                                handle: entry,
                                file: file,
                                pinned: isPinned,
                                displayName: isPinned ? entry.name.slice(1, -3) : entry.name.slice(0, -3),
                                lastModified: file.lastModified,
                                size: file.size,
                                content: content,
                                tags: parseNoteTags(content),
                                source: srcVal,
                                bodyText: baseBodyText,
                            });
                        }
                    } else {
                        files.push({
                            name: entry.name,
                            handle: entry,
                            file: file,
                            pinned: isPinned,
                            displayName: isPinned ? entry.name.slice(1, -3) : entry.name.slice(0, -3),
                            lastModified: file.lastModified,
                            size: file.size,
                            content: content,
                            tags: parseNoteTags(content),
                            source: parseNoteSource(content),
                            bodyText: baseBodyText,
                        });
                    }
                } catch (e) {
                    console.warn(`读取文件 ${entry.name} 失败`, e);
                }
            }
        }
    } catch (e) {
        console.warn('扫描文件夹失败', e);
    }
    return files;
}

function buildSourceIndex(noteFiles) {
    const index = new Map();
    for (const nf of noteFiles) {
        if (!nf.source) continue;
        const key = nf.source;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(nf);
    }
    return index;
}

function getNotesForSource(sourceIndex, title, type) {
    const key = `${title}::${type}`;
    const notes = sourceIndex.get(key) || [];
    return notes.sort((a, b) => b.lastModified - a.lastModified);
}

function extractSectionForSource(bodyText, sourceTitle) {
    const lines = bodyText.split('\n');
    const headingLines = [];
    for (let i = 0; i < lines.length; i++) {
        if (/^#\s+\S/.test(lines[i])) {
            headingLines.push(i);
        }
    }
    if (headingLines.length <= 1) {
        return bodyText;
    }
    const sourcePattern = sourceTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sourceRegex = new RegExp(`^#\\s+${sourcePattern}`, 'i');
    for (let h = 0; h < headingLines.length; h++) {
        const lineIndex = headingLines[h];
        if (sourceRegex.test(lines[lineIndex].trim())) {
            const start = lineIndex + 1;
            const end = h + 1 < headingLines.length ? headingLines[h + 1] : lines.length;
            return lines.slice(start, end).join('\n').trim();
        }
    }
    return bodyText;
}

async function syncThoughtsToSummary(title, type, thoughtsText) {
    if (!thoughtsText || !thoughtsText.trim()) return;
    try {
        const handle = await getFolderHandle();
        if (!handle) return;
        const hasPermission = await verifyFolderPermission(handle);
        if (!hasPermission) return;

        const allRecords = await loadRecords();
        const thoughtRecords = allRecords.filter(r => r.thoughts && r.thoughts.trim() !== '');
        const thoughtTitles = new Set(thoughtRecords.map(r => r.title));
        const statsLine = `> 自动同步 · 共 ${thoughtRecords.length} 条想法，涵盖 ${thoughtTitles.size} 部作品`;

        const typeMap = { book: '书籍', movie: '电影', anime: '动漫', series: '剧集', variety: '综艺' };

        const fileHandle = await handle.getFileHandle('想法汇总.md', { create: true });

        let existingContent = '';
        try {
            const file = await fileHandle.getFile();
            existingContent = await file.text();
        } catch (e) {
        }

        const groups = {};
        for (const r of thoughtRecords) {
            const key = r.title || '未命名';
            if (!groups[key]) groups[key] = { title: r.title, type: r.type, thoughts: [], maxId: 0 };
            groups[key].thoughts.push(r.thoughts.trim());
            if (r.id > groups[key].maxId) groups[key].maxId = r.id;
        }
        const sortedTitles = Object.keys(groups).sort((a, b) => groups[a].maxId - groups[b].maxId);
        let mdContent = `# 想法汇总\n\n${statsLine}\n\n---\n\n`;
        for (const t of sortedTitles) {
            const g = groups[t];
            const typeLabel = typeMap[g.type] || g.type;
            mdContent += `## ${t}\n> 类型：${typeLabel}\n\n`;
            for (const thought of g.thoughts) {
                mdContent += `${thought.replace(/\n/g, '  \n')}\n\n`;
            }
            mdContent += `---\n\n`;
        }

        const writable = await fileHandle.createWritable();
        await writable.write(mdContent);
        await writable.close();
    } catch (e) {
        console.warn('同步想法到想法汇总.md 失败', e);
    }
}

async function syncGoldenQuotesToSummary(title, type, quotesText) {
    if (!quotesText || !quotesText.trim()) return;
    try {
        const handle = await getFolderHandle();
        if (!handle) return;
        const hasPermission = await verifyFolderPermission(handle);
        if (!hasPermission) return;

        const allRecords = await loadRecords();
        const quoteRecords = allRecords.filter(r => r.goldenQuotes && r.goldenQuotes.trim() !== '');
        const quoteTitles = new Set(quoteRecords.map(r => r.title));
        const statsLine = `> 自动同步 · 共 ${quoteRecords.length} 条金句，涵盖 ${quoteTitles.size} 部作品`;

        const typeMap = { book: '书籍', movie: '电影', anime: '动漫', series: '剧集', variety: '综艺' };

        const fileHandle = await handle.getFileHandle('金句汇总.md', { create: true });

        let existingContent = '';
        try {
            const file = await fileHandle.getFile();
            existingContent = await file.text();
        } catch (e) {
        }

        const groups = {};
        for (const r of quoteRecords) {
            const key = r.title || '未命名';
            if (!groups[key]) groups[key] = { title: r.title, type: r.type, quotes: [], maxId: 0 };
            groups[key].quotes.push(r.goldenQuotes.trim());
            if (r.id > groups[key].maxId) groups[key].maxId = r.id;
        }
        const sortedTitles = Object.keys(groups).sort((a, b) => groups[a].maxId - groups[b].maxId);
        let mdContent = `# 金句汇总\n\n${statsLine}\n\n---\n\n`;
        for (const t of sortedTitles) {
            const g = groups[t];
            const typeLabel = typeMap[g.type] || g.type;
            mdContent += `## ${t}\n> 类型：${typeLabel}\n\n`;
            for (const quote of g.quotes) {
                mdContent += `${quote.replace(/\n/g, '  \n')}\n\n`;
            }
            mdContent += `---\n\n`;
        }

        const writable = await fileHandle.createWritable();
        await writable.write(mdContent);
        await writable.close();
    } catch (e) {
        console.warn('同步金句到金句汇总.md 失败', e);
    }
}
