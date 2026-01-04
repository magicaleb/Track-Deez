// Cloud Storage Manager for Track Deez
// Provides cloud storage options for cross-device data synchronization

/**
 * Base class for cloud storage providers
 */
class CloudStorageProvider {
    constructor() {
        this.isConfigured = false;
    }

    async configure(config) {
        throw new Error('configure() must be implemented by subclass');
    }

    async save(data) {
        throw new Error('save() must be implemented by subclass');
    }

    async load() {
        throw new Error('load() must be implemented by subclass');
    }

    async testConnection() {
        throw new Error('testConnection() must be implemented by subclass');
    }
}

/**
 * GitHub API Storage Provider
 * Stores data as JSON file in the repository
 */
class GitHubStorageProvider extends CloudStorageProvider {
    constructor() {
        super();
        this.token = null;
        this.owner = null;
        this.repo = null;
        this.branch = 'main';
        this.filePath = 'data/user-data.json';
        this.apiBase = 'https://api.github.com';
        this.lastSha = null;
    }

    async configure(config) {
        this.token = config.token;
        this.owner = config.owner;
        this.repo = config.repo;
        this.branch = config.branch || 'main';
        this.filePath = config.filePath || 'data/user-data.json';

        if (!this.token || !this.owner || !this.repo) {
            throw new Error('GitHub token, owner, and repo are required');
        }

        // Test the connection
        await this.testConnection();
        this.isConfigured = true;
    }

    async testConnection() {
        try {
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}`,
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`GitHub API error: ${error.message || response.statusText}`);
            }

            return true;
        } catch (error) {
            console.error('GitHub connection test failed:', error);
            throw new Error(`Failed to connect to GitHub: ${error.message}`);
        }
    }

    async load() {
        if (!this.isConfigured) {
            throw new Error('GitHub storage not configured');
        }

        try {
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.filePath}?ref=${this.branch}`,
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.status === 404) {
                // File doesn't exist yet, return null
                return null;
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`GitHub API error: ${error.message || response.statusText}`);
            }

            const fileData = await response.json();
            this.lastSha = fileData.sha;

            // Decode base64 content
            const content = atob(fileData.content);
            return JSON.parse(content);
        } catch (error) {
            console.error('Failed to load from GitHub:', error);
            throw error;
        }
    }

    async save(data) {
        if (!this.isConfigured) {
            throw new Error('GitHub storage not configured');
        }

        try {
            // Convert data to JSON and encode as base64
            const content = btoa(JSON.stringify(data, null, 2));

            // Prepare the request body
            const body = {
                message: `Update data - ${new Date().toISOString()}`,
                content: content,
                branch: this.branch
            };

            // If we have a SHA, include it (for updates)
            if (this.lastSha) {
                body.sha = this.lastSha;
            }

            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.filePath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`GitHub API error: ${error.message || response.statusText}`);
            }

            const result = await response.json();
            this.lastSha = result.content.sha;

            return true;
        } catch (error) {
            console.error('Failed to save to GitHub:', error);
            throw error;
        }
    }

    async getRepoInfo() {
        if (!this.token) {
            throw new Error('GitHub token not configured');
        }

        try {
            // Get user's repositories
            const response = await fetch(
                `${this.apiBase}/user/repos?per_page=100&sort=updated`,
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch repositories');
            }

            const repos = await response.json();
            return repos.map(repo => ({
                owner: repo.owner.login,
                name: repo.name,
                fullName: repo.full_name
            }));
        } catch (error) {
            console.error('Failed to get repo info:', error);
            throw error;
        }
    }
}

/**
 * Cloud Storage Manager
 * Manages cloud storage configuration and operations
 */
class CloudStorageManager {
    constructor() {
        this.provider = null;
        this.storageType = 'local'; // 'local' or 'cloud'
        this.config = this.loadConfig();
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.autoSyncInterval = null;
    }

    loadConfig() {
        const configStr = localStorage.getItem('cloudStorageConfig');
        if (configStr) {
            try {
                return JSON.parse(configStr);
            } catch (e) {
                console.error('Failed to parse cloud storage config:', e);
                return {};
            }
        }
        return {};
    }

    saveConfig() {
        localStorage.setItem('cloudStorageConfig', JSON.stringify(this.config));
    }

    getStorageMode() {
        return localStorage.getItem('storageMode') || 'local';
    }

    setStorageMode(mode) {
        localStorage.setItem('storageMode', mode);
        this.storageType = mode;
    }

    async configureGitHub(token, owner, repo, branch = 'main') {
        const provider = new GitHubStorageProvider();
        await provider.configure({ token, owner, repo, branch });
        
        this.provider = provider;
        this.config = {
            type: 'github',
            token,
            owner,
            repo,
            branch
        };
        this.saveConfig();
        
        return true;
    }

    async initializeFromConfig() {
        const mode = this.getStorageMode();
        this.storageType = mode;

        if (mode === 'cloud' && this.config.type === 'github') {
            try {
                const provider = new GitHubStorageProvider();
                await provider.configure(this.config);
                this.provider = provider;
                return true;
            } catch (error) {
                console.error('Failed to initialize cloud storage:', error);
                // Fall back to local storage
                this.setStorageMode('local');
                return false;
            }
        }

        return mode === 'local';
    }

    async syncData(localData) {
        if (this.storageType !== 'cloud' || !this.provider) {
            throw new Error('Cloud storage not configured');
        }

        if (this.syncInProgress) {
            throw new Error('Sync already in progress');
        }

        this.syncInProgress = true;

        try {
            // Load cloud data
            const cloudData = await this.provider.load();

            if (!cloudData) {
                // No cloud data exists, upload local data
                await this.provider.save(localData);
                this.lastSyncTime = new Date();
                return { action: 'uploaded', data: localData };
            }

            // Both exist - use last-write-wins strategy
            // Compare timestamps if available
            const localTimestamp = localData.lastModified || 0;
            const cloudTimestamp = cloudData.lastModified || 0;

            if (localTimestamp > cloudTimestamp) {
                // Local is newer, upload it
                await this.provider.save(localData);
                this.lastSyncTime = new Date();
                return { action: 'uploaded', data: localData };
            } else {
                // Cloud is newer or equal, use cloud data
                this.lastSyncTime = new Date();
                return { action: 'downloaded', data: cloudData };
            }
        } finally {
            this.syncInProgress = false;
        }
    }

    async uploadData(data) {
        if (this.storageType !== 'cloud' || !this.provider) {
            throw new Error('Cloud storage not configured');
        }

        // Add timestamp
        data.lastModified = Date.now();
        await this.provider.save(data);
        this.lastSyncTime = new Date();
        return true;
    }

    async downloadData() {
        if (this.storageType !== 'cloud' || !this.provider) {
            throw new Error('Cloud storage not configured');
        }

        const data = await this.provider.load();
        this.lastSyncTime = new Date();
        return data;
    }

    isCloudMode() {
        return this.storageType === 'cloud';
    }

    isConfigured() {
        return this.provider && this.provider.isConfigured;
    }

    clearConfig() {
        this.provider = null;
        this.config = {};
        this.storageType = 'local';
        localStorage.removeItem('cloudStorageConfig');
        this.setStorageMode('local');
    }
}
