import AsyncStorage from '@react-native-async-storage/async-storage';

const prefixs = {};
let defaultPrefix = null;

export let defaultSeperator = '$';

export function setPrefix(key, value, isDefault = false) {
    if (value !== null && value !== undefined) {
        const prefix = Array.isArray(value) ? value : [value];
        prefixs[key] = prefix;
        if (isDefault) {
            defaultPrefix = key;
        }
    } else {
        delete prefixs[key];
        if (defaultPrefix === key) {
            defaultPrefix = null;
        }
    }
}

export function set(keys, content, prefix = undefined) {
    const value = JSON.stringify(content);
    const key = generateKey(keys, prefix);
    return AsyncStorage.setItem(key, value);
}

export function get(keys, prefix = undefined) {
    const key = generateKey(keys, prefix);
    return AsyncStorage.getItem(key)
        .then(result => JSON.parse(result));
}

export function remove(keys, prefix = undefined) {
    const key = generateKey(keys, prefix);
    return AsyncStorage.removeItem(key);
}

export function merge(keys, content, prefix = undefined) {
    const value = JSON.stringify(content);
    const key = generateKey(keys, prefix);
    return AsyncStorage.mergeItem(key, value);
}

export function clear(keys, prefix = undefined) {
    const keyPrefix = generateKey(keys, prefix);
    return AsyncStorage.getAllKeys()
        .then(result => {
            const filteredKeys = result.filter(item => item.startsWith(keyPrefix));
            return AsyncStorage.multiRemove(filteredKeys);
        });
}

export function getKeys(keys, prefix = undefined) {
    const keyPrefix = generateKey(keys, prefix);
    return AsyncStorage.getAllKeys()
        .then(result => {
            const filteredKeys = result.filter(item => item.startsWith(keyPrefix));
            return AsyncStorage.multiGet(filteredKeys);
        })
        .then(result => result.map(i => JSON.parse(i[1])));
}

export function multiGet(keys, prefix = undefined) {
    const realKeys = keys.map(key => generateKey(key, prefix));
    return AsyncStorage.multiGet(realKeys)
        .then(result => result.map(i => JSON.parse(i[1])));
}

export function multiSet(keys, values, prefix = undefined) {
    const keyValuePairs = keys.map((key, index) => {
        return [generateKey(key, prefix), JSON.stringify(values[index])];
    });
    return AsyncStorage.multiSet(keyValuePairs);
}

export function multiRemove(keys, prefix = undefined) {
    const realKeys = keys.map(key => generateKey(key, prefix));
    return AsyncStorage.multiRemove(realKeys);
}

function generateKey(keys, prefix) {
    const key = Array.isArray(keys) ? keys : [keys];
    let prefixItems;
    if (prefix) {
        if (!prefixs[prefix]) {
            throw new Error('prefix ' + prefix + ' is not set previously');
        } else {
            prefixItems = prefixs[prefix];
        }
    } else {
        if (!defaultPrefix || !prefixs[defaultPrefix]) {
            throw new Error('you must set a default prefix at least');
        } else {
            prefixItems = prefixs[defaultPrefix];
        }
    }
    return [...prefixItems, ...key].join(defaultSeperator);
}
