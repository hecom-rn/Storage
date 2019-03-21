# Storage

[![npm version](https://img.shields.io/npm/v/@hecom/storage.svg?style=flat)](https://www.npmjs.com/package/@hecom/storage)
[![Build Status](https://travis-ci.org/hecom-rn/Storage.svg?branch=master)](https://travis-ci.org/hecom-rn/Storage)

这是对于持久化存储库[react-native-general-storage](https://github.com/gaoxiaosong/react-native-general-storage)的进一步封装，加入了前缀管理，以及存储区的判重逻辑，对外隐藏了前缀的实现。

前缀分为两种：一种是Common前缀，表示跟用户无关的数据存储；一种是User前缀，表示用户相关的数据存储。