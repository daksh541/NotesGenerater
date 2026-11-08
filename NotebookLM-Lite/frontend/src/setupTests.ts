const storage: Record<string, string> = {};
export const mockLocalStorage = {
    getItem: (key: string) => (key in storage ? storage[key] : null),
    setItem: (key: string, value: string) => {
        storage[key] = String(value);
    },
    removeItem: (key: string) => {
        delete storage[key];
    },
    clear: () => {
        for (const key of Object.keys(storage)) {
            delete storage[key];
        }
    },
    get length() {
        return Object.keys(storage).length;
    },
    key: (index: number) => Object.keys(storage)[index] || null,
};

Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
});
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
    });
    if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
        Element.prototype.scrollIntoView = () => {};
    }
}

