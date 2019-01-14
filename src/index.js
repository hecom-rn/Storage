import AsyncStorage from 'react-native-general-storage';

const rootNode = {
    parts: {},
};

const CommonPart = '__common__';
const UserPart = '__user__';

export default {
    initGlobal: _initGlobal,
    registerPart: _registerPart,
    setUserId: _setUserId,
    set: _wrapper(AsyncStorage.set, 2),
    get: _wrapper(AsyncStorage.get, 1),
    remove: _wrapper(AsyncStorage.remove, 1),
    merge: _wrapper(AsyncStorage.merge, 2),
    clear: _wrapper(AsyncStorage.clear, 1),
    getKeys: _wrapper(AsyncStorage.getKeys, 1),
    multiGet: _wrapper(AsyncStorage.multiGet, 1),
    multiSet: _wrapper(AsyncStorage.multiSet, 2),
    multiRemove: _wrapper(AsyncStorage.multiRemove, 1),
};

function _initGlobal() {
    AsyncStorage.setPrefix(CommonPart, CommonPart);
    _setUserId(null);
}

function _registerPart(key, moduleName) {
    if (rootNode.parts[key]) {
        throw new Error(key + ' has been registered by ' + rootNode.parts[key]);
    } else {
        rootNode.parts[key] = moduleName;
    }
}

function _setUserId(userId) {
    AsyncStorage.setPrefix(UserPart, userId, true);
}

function _wrapper(func, commonIndex) {
    return function (...params) {
        const prefix = params[commonIndex] ? CommonPart : UserPart;
        params[commonIndex] = prefix;
        return func(...params);
    };
}