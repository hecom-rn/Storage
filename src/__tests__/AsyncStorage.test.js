jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    mergeItem: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve(['__user__$x', 'other'])),
    multiGet: jest.fn(() => Promise.resolve([['k', '{"a":1}']])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
}));

// @hecom/initialization 也是 TS 源码包，落在 node_modules 后不被 jest 转换，直接 mock
jest.mock('@hecom/initialization', () => ({
    __esModule: true,
    default: { add: jest.fn(), process: jest.fn() },
}));

// 前缀注册表是模块级状态，每个用例重置模块保证互不污染
let mod;
beforeEach(() => {
    jest.resetModules();
    mod = require('../AsyncStorage');
});

describe('分区前缀未注册时（登出/会话过期窗口）', () => {
    test('全部公开函数返回 rejected promise，不再同步 throw', async () => {
        const calls = [
            () => mod.get(['x']),
            () => mod.set(['x'], {}),
            () => mod.set(['x'], null),
            () => mod.remove(['x']),
            () => mod.merge(['x'], {}),
            () => mod.clear(['x']),
            () => mod.getStartsWith(['x']),
            () => mod.getKeys(['x']),
            () => mod.multiGet([['x'], ['y']]),
            () => mod.multiSet([['x'], ['y']], [1, 2]),
            () => mod.multiRemove([['x'], ['y']]),
        ];
        await Promise.all(
            calls.map((call) => {
                let promise;
                expect(() => {
                    promise = call();
                }).not.toThrow();
                return expect(promise).rejects.toThrow('you must set a default prefix at least');
            })
        );
    });

    test('显式传入未注册前缀同样 reject', async () => {
        await expect(mod.get(['x'], '__user__')).rejects.toThrow(
            'prefix __user__ is not set previously'
        );
    });
});

describe('包装层（src/index.ts）登出时序契约', () => {
    test('setUserId(null) 模拟登出后，默认分区调用 reject 而非同步 throw', async () => {
        const index = require('../index').default;
        index.setUserId('u9');
        index.setUserId(null);
        const read = () => index.get(['ProcessCommentCache', 'version_1']);
        let promise;
        expect(() => {
            promise = read();
        }).not.toThrow();
        await expect(promise).rejects.toThrow('prefix __user__ is not set previously');
    });

    test('登录后注册前缀，读取正常且落到 __user__ 分区', async () => {
        const index = require('../index').default;
        index.setUserId('u9');
        await index.set(['k'], { b: 2 });
        expect(require('@react-native-async-storage/async-storage').setItem).toHaveBeenCalledWith(
            'u9$k',
            JSON.stringify({ b: 2 })
        );
    });
});

describe('前缀注册后正常读写', () => {
    test('get 以 前缀$key 调用原生并解析 JSON', async () => {
        const asyncStorage = require('@react-native-async-storage/async-storage');
        asyncStorage.getItem.mockResolvedValue(JSON.stringify({ a: 1 }));
        mod.setPrefix('__user__', ['u1'], true);
        await expect(mod.get(['x'])).resolves.toEqual({ a: 1 });
        expect(asyncStorage.getItem).toHaveBeenCalledWith('u1$x');
    });

    test('set 写入拼接 key 的序列化值', async () => {
        const asyncStorage = require('@react-native-async-storage/async-storage');
        mod.setPrefix('__user__', ['u1'], true);
        await mod.set(['x'], { b: 2 });
        expect(asyncStorage.setItem).toHaveBeenCalledWith('u1$x', JSON.stringify({ b: 2 }));
    });
});
