import * as AsyncStorage from './AsyncStorage';
import Initialization from '@hecom/initialization';

const rootNode = {
    parts: {},
};

const ModuleName = '@hecom/storage';
const CommonPart = '__common__';
const UserPart = '__user__';

export default {
    name: ModuleName,
    registerPart: _registerPart,
    setUserId: _setUserId,
    setPrefix: AsyncStorage.setPrefix,
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

Initialization.add(ModuleName, function () {
    AsyncStorage.setPrefix(CommonPart, CommonPart);
    _setUserId(null);
});

/**
 * 注册存储区域。
 * @param key 唯一的键，重复会报错
 * @param moduleName 对应模块名称
 */
function _registerPart(key, moduleName) {
    if (rootNode.parts[key]) {
        console.error(key, 'has been registered by', rootNode.parts[key]); // eslint-disable-line no-console
    } else {
        rootNode.parts[key] = moduleName;
    }
}

/**
 * 设置用户存储区的前缀，即用户Id。
 * @param userId 用户Id
 */
function _setUserId(userId) {
    AsyncStorage.setPrefix(UserPart, userId, true);
}

/**
 * 对于react-native-general-storage中的接口的封装。
 * @param func 接口方法
 * @param commonIndex 分区参数在参数列表中的位置，从0开始计数
 */
function _wrapper(func, commonIndex) {
    return function (...params) {
        const prefix = params[commonIndex] ? CommonPart : UserPart;
        params[commonIndex] = prefix;
        return func(...params);
    };
}
