# Storage

这是对于持久化存储库[react-native-general-storage](https://github.com/gaoxiaosong/react-native-general-storage)的进一步封装，加入了前缀管理，以及存储区的判重逻辑，对外隐藏了前缀的实现。

前缀分为两种：一种是Common前缀，表示跟用户无关的数据存储；一种是User前缀，表示用户相关的数据存储。

## 安装

```shell
yarn add @hecom/storage
```

## 使用方法

```javascript
import AsyncStorage from '@hecom/storage';
```

### 接口

管理接口如下：

* `initGlobal: () => void`：全局初始化模块。
* `registerPart: (key, moduleName) => void`：注册存储区域，`key`是存储区域的键值，`moduleName`是对应的模块名。如果之前有注册，则抛出异常。
* `setUserId: (userId) => void`：设置User前缀对应的用户Id。

封装接口：

包括`react-native-general-storage`中的所有接口的封装，每个接口的最后一个`prefix: string`参数，都改为`isCommon: boolean`参数，其余参数不变。如果`isCommon`为`true`，则使用Common前缀，否则使用User前缀。