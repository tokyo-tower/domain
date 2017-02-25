# 元祖興行パッケージドメインモデル for Node.js

元祖興行パッケージオンラインチケットシステムのドメインモデルをnode.jsで使いやすいようにまとめたパッケージです。

# Features

# Getting Started

## Install

```shell
npm install --save @motionpicture/chevre-domain
```

## Usage

```Javascript
var CHEVRE = require("@motionpicture/chevre-domain");
```

前提として、mongooseでdefault connectionを確保することと、redis情報をセットすることが必要。

* mongoose default connection
```Javascript
mongoose.connect();
```

* set environment variables
```shell
set CHEVRE_PERFORMANCE_STATUSES_REDIS_PORT=*****
set CHEVRE_PERFORMANCE_STATUSES_REDIS_HOST=*****
set CHEVRE_PERFORMANCE_STATUSES_REDIS_KEY=*****
```

## Code Samples

コードサンプルが./examplesにあります。

# tslint

コード品質チェックをtslintで行っています。lintパッケージとして以下を仕様。
* [tslint](https://github.com/palantir/tslint)
* [tslint-microsoft-contrib](https://github.com/Microsoft/tslint-microsoft-contrib)
`npm run tslint`でチェック実行。改修の際には、必ずチェックすること。

# Test

`npm test`でテスト実行。パッケージをpublishする前にこれで確認。しかし、現状テストコードなし...

# JsDoc

`npm run jsdoc`でjsdocを作成できます。./docsに出力されます。
