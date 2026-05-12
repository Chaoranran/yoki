/*
 * db.js — 又记 IndexedDB 数据管理层
 *
 * API 清单：
 *   openDB()                              — 打开数据库连接
 *   loadRecords()                         — 获取全部记录
 *   saveRecords(records)                  — 全量保存（先清空再写入，兼容旧逻辑）
 *   addRecord(record)                     — 新增单条记录
 *   updateRecord(id, updates)             — 更新指定记录（合并 updates）
 *   deleteRecord(id)                      — 删除指定记录
 *   getRecordById(id)                     — 获取指定记录
 *   saveFolderHandle(handle)              — 存储笔记文件夹句柄
 *   getFolderHandle()                     — 获取笔记文件夹句柄
 *   verifyFolderPermission(handle)        — 验证/请求文件夹读写权限
 *   normalizeTags(record)                — 将旧 tags:string 转为 tags:string[]
 *   migrateFromLocalStorage()             — 旧数据迁移（只执行一次）
 */

const DB_NAME = 'YoujiDB';
const DB_VERSION = 6;
const STORE_NAME = 'records';
const TRASH_STORE = 'trash';
const CONFIG_STORE = 'config';
const BOOKSHELF_STORE = 'bookshelf';
const FOLDER_HANDLE_KEY = 'folderHandle';

function normalizeTags(record) {
    if (!record) return record;
    if (record.tags == null || record.tags === '') {
        record.tags = [];
    } else if (typeof record.tags === 'string') {
        record.tags = record.tags.split(/[,，]/).map(t => t.trim()).filter(t => t);
    }
    return record;
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(TRASH_STORE)) {
                db.createObjectStore(TRASH_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(CONFIG_STORE)) {
                db.createObjectStore(CONFIG_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(BOOKSHELF_STORE)) {
                db.createObjectStore(BOOKSHELF_STORE, { keyPath: 'path' });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function loadRecords() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const result = request.result;
            result.forEach(r => normalizeTags(r));
            resolve(result);
        };
        request.onerror = () => reject(request.error);
    });
}

async function saveRecords(records) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        store.clear();

        records.forEach(record => store.put(record));

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function addRecord(record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(record);

        request.onsuccess = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
    });
}

async function updateRecord(id, updates) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const existing = getRequest.result;
            if (!existing) {
                reject(new Error(`记录 ${id} 不存在`));
                return;
            }
            const updated = { ...existing, ...updates, id };
            const putRequest = store.put(updated);
            putRequest.onsuccess = () => resolve(updated);
        };

        tx.onerror = () => reject(tx.error);
    });
}

async function deleteRecord(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getRecordById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            const result = request.result;
            if (result) normalizeTags(result);
            resolve(result);
        };
        request.onerror = () => reject(request.error);
    });
}

async function batchUpdateRecords(updatesArray) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const failed = [];
        let completed = 0;

        updatesArray.forEach(({ id, updates }) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                if (!existing) {
                    failed.push({ id, error: '记录不存在' });
                } else {
                    store.put({ ...existing, ...updates, id });
                }
                completed++;
                if (completed === updatesArray.length) {
                    if (failed.length) console.warn('批量更新失败项：', failed);
                    resolve(failed);
                }
            };
            getRequest.onerror = () => {
                failed.push({ id, error: getRequest.error });
                completed++;
                if (completed === updatesArray.length) {
                    console.warn('批量更新失败项：', failed);
                    resolve(failed);
                }
            };
        });

        tx.onerror = () => reject(tx.error);
    });
}

async function saveFolderHandle(handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CONFIG_STORE, 'readwrite');
        const store = tx.objectStore(CONFIG_STORE);
        store.put({ id: FOLDER_HANDLE_KEY, handle });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getFolderHandle() {
    const db = await openDB();
    // 先在新 store 中查找
    let handle = await new Promise((resolve, reject) => {
        const tx = db.transaction(CONFIG_STORE, 'readonly');
        const store = tx.objectStore(CONFIG_STORE);
        const request = store.get(FOLDER_HANDLE_KEY);
        request.onsuccess = () => resolve(request.result?.handle || null);
        request.onerror = () => reject(request.error);
    });
    // 新 store 没有，从旧 records store 迁移
    if (!handle) {
        handle = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(FOLDER_HANDLE_KEY);
            req.onsuccess = () => {
                const h = req.result?.handle || null;
                if (h) {
                    // 迁移到新 store 并删除旧数据
                    const configTx = db.transaction(CONFIG_STORE, 'readwrite');
                    configTx.objectStore(CONFIG_STORE).put({ id: FOLDER_HANDLE_KEY, handle: h });
                    store.delete(FOLDER_HANDLE_KEY);
                }
                resolve(h);
            };
            req.onerror = () => reject(req.error);
        });
    }
    return handle;
}

async function verifyFolderPermission(handle) {
    if (!handle) return false;
    if (typeof handle.queryPermission !== 'function') {
        console.warn('文件夹句柄已失效，请在笔记页重新选择文件夹');
        return false;
    }
    try {
        const options = { mode: 'readwrite' };
        if ((await handle.queryPermission(options)) === 'granted') return true;
        if ((await handle.requestPermission(options)) === 'granted') return true;
    } catch (e) {
        console.warn('文件夹权限验证失败', e);
    }
    return false;
}

async function migrateFromLocalStorage() {
    const oldKey = 'book_movie_records';
    const oldData = localStorage.getItem(oldKey);
    if (oldData) {
        try {
            const parsed = JSON.parse(oldData);
            if (parsed.length > 0) {
                await saveRecords(parsed);
                console.log('已迁移 ' + parsed.length + ' 条记录到 IndexedDB');
            }
            localStorage.removeItem(oldKey);
        } catch (e) {
            console.warn('旧数据迁移失败，忽略', e);
        }
    }
}

async function addToTrash(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TRASH_STORE, 'readwrite');
        const store = tx.objectStore(TRASH_STORE);
        const trashItem = {
            ...item,
            deletedAt: Date.now(),
        };
        const request = store.put(trashItem);
        request.onsuccess = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function loadTrash() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TRASH_STORE, 'readonly');
        const store = tx.objectStore(TRASH_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function removeFromTrash(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TRASH_STORE, 'readwrite');
        const store = tx.objectStore(TRASH_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function clearTrash() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TRASH_STORE, 'readwrite');
        const store = tx.objectStore(TRASH_STORE);
        const request = store.clear();
        request.onsuccess = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getTrashItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TRASH_STORE, 'readonly');
        const store = tx.objectStore(TRASH_STORE);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/* ── 书架 ── */

async function saveBookshelfFolderHandle(handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CONFIG_STORE, 'readwrite');
        tx.objectStore(CONFIG_STORE).put({ id: 'bookshelfFolderHandle', handle });
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}

async function getBookshelfFolderHandle() {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(CONFIG_STORE, 'readonly');
        const req = tx.objectStore(CONFIG_STORE).get('bookshelfFolderHandle');
        req.onsuccess = () => resolve(req.result?.handle || null);
        req.onerror = () => resolve(null);
    });
}

async function saveBookCache(book) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(BOOKSHELF_STORE, 'readwrite');
        tx.objectStore(BOOKSHELF_STORE).put(book);
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}

async function loadAllBookCache() {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(BOOKSHELF_STORE, 'readonly');
        const req = tx.objectStore(BOOKSHELF_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
    });
}

async function clearBookCache() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(BOOKSHELF_STORE, 'readwrite');
        tx.objectStore(BOOKSHELF_STORE).clear();
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}

/* ── JSONL 本地存储 ── */

async function ensureRecordsJSONL(folderHandle) {
    if (!folderHandle) return;
    try {
        await folderHandle.getFileHandle('records.jsonl');
    } catch (e) {
        if (e.name !== 'NotFoundError') return;
        const fileHandle = await folderHandle.getFileHandle('records.jsonl', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write('');
        await writable.close();
    }
}

async function loadRecordsFromJSONL(folderHandle) {
    if (!folderHandle) return { records: [], fallback: false };
    try {
        const fileHandle = await folderHandle.getFileHandle('records.jsonl');
        const file = await fileHandle.getFile();
        const text = await file.text();
        if (!text.trim()) return { records: [], fallback: false };
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const records = [];
        let parseErrors = 0;
        for (const line of lines) {
            try {
                const record = JSON.parse(line);
                records.push(normalizeTags(record));
            } catch (e) {
                parseErrors++;
                console.warn('JSONL 解析失败，跳过该行:', line.substring(0, 100));
            }
        }
        // 如果解析错误率超过 50%，认为文件损坏
        if (parseErrors > 0 && parseErrors / lines.length > 0.5) {
            console.error('records.jsonl 文件损坏，解析错误率过高');
            return { records: [], fallback: true, error: '文件损坏' };
        }
        return { records, fallback: false };
    } catch (e) {
        if (e.name === 'NotFoundError') return { records: [], fallback: false };
        console.warn('读取 records.jsonl 失败', e);
        return { records: [], fallback: true, error: e.message };
    }
}

async function appendRecordToJSONL(folderHandle, record) {
    if (!folderHandle) return { success: false };
    try {
        const fileHandle = await folderHandle.getFileHandle('records.jsonl');
        const file = await fileHandle.getFile();
        const writable = await fileHandle.createWritable({ keepExistingData: true });
        await writable.seek(file.size);
        await writable.write(JSON.stringify(record) + '\n');
        await writable.close();
        return { success: true };
    } catch (e) {
        console.warn('追加记录到 JSONL 失败', e);
        return { success: false, error: e.message };
    }
}

async function rewriteRecordsJSONL(folderHandle, records) {
    if (!folderHandle) return { success: false };
    try {
        const fileHandle = await folderHandle.getFileHandle('records.jsonl');
        // 先读取备份当前内容
        let backupContent = '';
        try {
            const file = await fileHandle.getFile();
            backupContent = await file.text();
        } catch (e) {
            // 文件不存在，无需备份
        }
        const writable = await fileHandle.createWritable();
        const content = records.map(r => JSON.stringify(r)).join('\n') + '\n';
        await writable.write(content);
        await writable.close();
        return { success: true };
    } catch (e) {
        console.warn('重写 JSONL 失败', e);
        return { success: false, error: e.message };
    }
}

async function migrateFromIndexedDBToJSONL(folderHandle) {
    if (!folderHandle) return;
    try {
        await ensureRecordsJSONL(folderHandle);
        const records = await loadRecords();
        if (records.length === 0) return;
        await rewriteRecordsJSONL(folderHandle, records);
        console.log('已迁移 ' + records.length + ' 条记录到 JSONL');
    } catch (e) {
        console.warn('迁移到 JSONL 失败', e);
    }
}
