// IndexedDB Manager for Track Deez
// Provides a clean interface for IndexedDB operations

class DBManager {
    constructor() {
        this.dbName = 'TrackDeezDB';
        this.version = 3; // Incremented for plannerEvents store
        this.db = null;
        this.isIndexedDBAvailable = this.checkIndexedDBSupport();
    }

    checkIndexedDBSupport() {
        return 'indexedDB' in window;
    }

    /**
     * Initialize the database and create object stores
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        if (!this.isIndexedDBAvailable) {
            throw new Error('IndexedDB is not available');
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error('Failed to open database: ' + request.error));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('habits')) {
                    db.createObjectStore('habits', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('trackingFields')) {
                    db.createObjectStore('trackingFields', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('days')) {
                    db.createObjectStore('days', { keyPath: 'date' });
                }

                if (!db.objectStoreNames.contains('plannerEvents')) {
                    db.createObjectStore('plannerEvents', { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Get all items from a store
     * @param {string} storeName
     * @returns {Promise<Array>}
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a single item by key
     * @param {string} storeName
     * @param {string} key
     * @returns {Promise<any>}
     */
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Add or update an item in a store
     * @param {string} storeName
     * @param {any} item
     * @returns {Promise<void>}
     */
    async put(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Add multiple items to a store
     * @param {string} storeName
     * @param {Array} items
     * @returns {Promise<void>}
     */
    async putAll(storeName, items) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

            items.forEach(item => store.put(item));
        });
    }

    /**
     * Delete an item from a store
     * @param {string} storeName
     * @param {string} key
     * @returns {Promise<void>}
     */
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all items from a store
     * @param {string} storeName
     * @returns {Promise<void>}
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all data from all stores
     * @returns {Promise<void>}
     */
    async clearAll() {
        await this.clear('habits');
        await this.clear('trackingFields');
        await this.clear('days');
        await this.clear('plannerEvents');
    }
}
