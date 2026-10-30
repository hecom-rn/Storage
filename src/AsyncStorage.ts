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
    if (content === null || content === undefined) {
        return remove(keys, prefix);
    }
    const value = JSON.stringify(content);
    let key;
    try {
        key = generateKey(keys, prefix);
    } catch (e) {
        return Promise.reject(e);
    }
    return AsyncStorage.setItem(key, value);
}

export function get(keys, prefix = undefined) {
    let key;
    try {
        key = generateKey(keys, prefix);
    } catch (e) {
        if (isPrefixNotSetError(e)) {
            return Promise.resolve(undefined);
        }
        return Promise.reject(e);
    }
    return AsyncStorage.getItem(key)
        .then(result => JSON.parse(result));
}

export function remove(keys, prefix = undefined) {
    let key;
    try {
        key = generateKey(keys, prefix);
    } catch (e) {
        return Promise.reject(e);
    }
    return AsyncStorage.removeItem(key);
}

export function merge(keys, content, prefix = undefined) {
    const value = JSON.stringify(content);
    let key;
    try {
        key = generateKey(keys, prefix);
    } catch (e) {
        return Promise.reject(e);
    }
    return AsyncStorage.mergeItem(key, value);
}

export function clear(keys, prefix = undefined) {
    let keyPrefix;
    try {
        keyPrefix = generateKey(keys, prefix);
    } catch (e) {
        return Promise.reject(e);
    }
    return AsyncStorage.getAllKeys()
        .then(result => {
            const filteredKeys = result.filter(item => item.startsWith(keyPrefix));
            return AsyncStorage.multiRemove(filteredKeys);
        });
}

export function getStartsWith(keys, prefix = undefined) {
    let keyPrefix;
    try {
        keyPrefix = generateKey(keys, prefix);
    } catch (e) {
        if (isPrefixNotSetError(e)) {
            return Promise.resolve([]);
        }
        return Promise.reject(e);
    }
    return AsyncStorage.getAllKeys()
        .then(result => {
            const filteredKeys = result.filter(item => item.startsWith(keyPrefix));
            return AsyncStorage.multiGet(filteredKeys);
        }).then(result => result.map(i => {
                const key = i[0];
                const value = JSON.parse(i[1]);
                const oriKeys = Array.isArray(keys) ? keys : [keys];
                const end = key.slice(keyPrefix.length + defaultSeperator.length).split(defaultSeperator);
                return {
                    oriKey: oriKeys.concat(end),
                    value
                }
            })
        )
}

export function getKeys(keys, prefix = undefined) {
    let keyPrefix;
    try {
        keyPrefix = generateKey(keys, prefix);
    } catch (e) {
        if (isPrefixNotSetError(e)) {
            return Promise.resolve([]);
        }
        return Promise.reject(e);
    }
    return AsyncStorage.getAllKeys()
        .then(result => {
            const filteredKeys = result.filter(item => item.startsWith(keyPrefix));
            return AsyncStorage.multiGet(filteredKeys);
        })
        .then(result => result.map(i => JSON.parse(i[1])));
}

export function multiGet(keys, prefix = undefined) {
    let realKeys;
    try {
        realKeys = keys.map(key => generateKey(key, prefix));
    } catch (e) {
        if (isPrefixNotSetError(e)) {
            return Promise.resolve([]);
        }
        return Promise.reject(e);
    }
    return AsyncStorage.multiGet(realKeys)
        .then(result => result.map(i => JSON.parse(i[1])));
}

export function multiSet(keys, values, prefix = undefined) {
    let keyValuePairs;
    try {
        keyValuePairs = keys.map((key, index) => {
            return [generateKey(key, prefix), JSON.stringify(values[index])];
        });
    } catch (e) {
        return Promise.reject(e);
    }
    return AsyncStorage.multiSet(keyValuePairs);
}

export function multiRemove(keys, prefix = undefined) {
    let realKeys;
    try {
        realKeys = keys.map(key => generateKey(key, prefix));
    } catch (e) {
        return Promise.reject(e);
    }
    return AsyncStorage.multiRemove(realKeys);
}

// 分区前缀未注册时（登出/会话过期瞬间 __user__ 前缀被注销，或启动初始化前）
// generateKey 会同步 throw，异常直接穿透到调用方同步栈（构造函数/回调）导致
// fatal 崩溃。以上各公开函数统一把该异常转为 rejected promise，
// 使调用方已有的 .catch 能按预期接住
//
// 读接口（get/getKeys/getStartsWith/multiGet）对「分区未注册」进一步兜底空值：
// 未登录态本就没有用户分区数据，undefined/[] 是真实语义。rejected promise 在
// 调用方无 .catch 时仍会以 unhandled rejection 冒泡上报 Sentry
// （Sentry CRMPLUS-2BR：登录失败流程的登录任务/首页组件在窗口期读分区，
// count=398/users=368），兜底后整组收敛。
// 写接口保持 reject：分区未注册时写入会丢失数据，不能静默丢弃。
function isPrefixNotSetError(e) {
    return (
        e instanceof Error &&
        (/ is not set previously$/.test(e.message) ||
            e.message === 'you must set a default prefix at least')
    );
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
