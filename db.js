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
const DB_VERSION = 2;
const STORE_NAME = 'records';
const TRASH_STORE = 'trash';
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
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ id: FOLDER_HANDLE_KEY, handle });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getFolderHandle() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(FOLDER_HANDLE_KEY);

        request.onsuccess = () => {
            const handle = request.result?.handle || null;
            resolve(handle);
        };
        request.onerror = () => reject(request.error);
    });
}

async function verifyFolderPermission(handle) {
    if (!handle) return false;
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
