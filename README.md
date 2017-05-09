# 東京タワードメインモデル for Node.js

東京タワーオンラインチケットシステムのドメインモデルをnode.jsで使いやすいようにまとめたパッケージです。

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

コードサンプルが./examplesにあります。

# tslint

コード品質チェックをtslintで行っています。lintパッケージとして以下を仕様。
* [tslint](https://github.com/palantir/tslint)
* [tslint-microsoft-contrib](https://github.com/Microsoft/tslint-microsoft-contrib)
`npm run check`でチェック実行。改修の際には、必ずチェックすること。

# Test

`npm test`でテスト実行。パッケージをpublishする前にこれで確認。

# JsDoc

`npm run jsdoc`でjsdocを作成できます。./docsに出力されます。
