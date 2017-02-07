# 東京タワードメインモデル for Node.js

東京タワーオンラインチケットシステムのドメインモデルをnode.jsで使いやすいようにまとめたモジュールです。

# Features

# Getting Started

## Install

```shell
npm install --save @motionpicture/ttts-domain
```

## Usage

```Javascript
var TTTS = require("@motionpicture/ttts-domain");
```

前提として、mongooseでdefault connectionを確保することと、redis情報をセットすることが必要。

* mongoose default connection
```Javascript
mongoose.connect();
```

* set environment variables
```shell
set TTTS_PERFORMANCE_STATUSES_REDIS_PORT=*****
set TTTS_PERFORMANCE_STATUSES_REDIS_HOST=*****
set TTTS_PERFORMANCE_STATUSES_REDIS_KEY=*****
```


## Code Samples

Some samples are available.

* [How to get performance statuses from Node.js](/examples/getPerformanceStatuses.js)
