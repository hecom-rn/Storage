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
    test('写接口返回 rejected promise，不再同步 throw', async () => {
        const calls = [
            () => mod.set(['x'], {}),
            () => mod.set(['x'], null),
            () => mod.remove(['x']),
            () => mod.merge(['x'], {}),
            () => mod.clear(['x']),
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

    test('显式传入未注册前缀，写接口同样 reject', async () => {
        await expect(mod.remove(['x'], '__user__')).rejects.toThrow(
            'prefix __user__ is not set previously'
        );
    });
});

describe('包装层（src/index.ts）登出时序契约', () => {
    test('setUserId(null) 模拟登出后，默认分区写接口 reject 而非同步 throw', async () => {
        const index = require('../index').default;
        index.setUserId('u9');
        index.setUserId(null);
        const write = () => index.set(['k'], { a: 1 });
        let promise;
        expect(() => {
            promise = write();
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

describe('读接口在分区未注册时兜底空值（Sentry CRMPLUS-2BR）', () => {
    // 线上登录失败流程（_startLoginProcess 触发的登录任务）与首页组件构造函数
    // 会在 __user__ 分区注册前读存储；1.2.0 把同步 throw 转为 rejected promise 后，
    // 无 .catch 的调用方仍产生 unhandled rejection 上报 Sentry（count=398/users=368）。
    // 契约：读接口对「分区未注册」兜底空值——未登录态本就没有用户数据，
    // undefined/[] 是真实语义；写接口保持 reject（数据不可静默丢弃）。
    test('get resolve undefined，不再 reject', async () => {
        await expect(mod.get(['ProcessCommentCache', 'version_1'])).resolves.toBeUndefined();
    });

    test('getKeys resolve 空数组', async () => {
        await expect(mod.getKeys(['x'])).resolves.toEqual([]);
    });

    test('getStartsWith resolve 空数组', async () => {
        await expect(mod.getStartsWith(['x'])).resolves.toEqual([]);
    });

    test('multiGet resolve 空数组', async () => {
        await expect(mod.multiGet([['x'], ['y']])).resolves.toEqual([]);
    });

    test('显式传入未注册前缀的 get 同样兜底 undefined', async () => {
        await expect(mod.get(['x'], '__user__')).resolves.toBeUndefined();
    });

    test('包装层 setUserId(null) 登出后，默认分区 get 兜底 undefined（不产生 rejection）', async () => {
        const index = require('../index').default;
        index.setUserId('u9');
        index.setUserId(null);
        let promise;
        expect(() => {
            promise = index.get(['ProcessCommentCache', 'version_1']);
        }).not.toThrow();
        await expect(promise).resolves.toBeUndefined();
    });

    test('写接口仍 reject，数据不静默丢弃', async () => {
        await expect(mod.set(['x'], {})).rejects.toThrow();
        await expect(mod.remove(['x'])).rejects.toThrow();
        await expect(mod.clear(['x'])).rejects.toThrow();
    });
});
