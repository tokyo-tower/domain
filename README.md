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

### Environment variables

| Name                                    | Required | Value         | Purpose                |
| --------------------------------------- | -------- | ------------- | ---------------------- |
| `DEBUG`                                 | false    | ttts-domain:* | Debug                  |
| `NPM_TOKEN`                             | true     |               | NPM auth token         |
| `GMO_ENDPOINT`                          | true     |               | GMO API endpoint       |
| `GMO_SITE_ID`                           | true     |               | GMO SiteID             |
| `GMO_SITE_PASS`                         | true     |               | GMO SitePass           |
| `WHEELCHAIR_RATE_LIMIT_THRESHOLD`       | true     |               | 車椅子流入制限閾値     |
| `WHEELCHAIR_RATE_LIMIT_UNIT_IN_SECONDS` | true     |               | 車椅子流入制限単位(秒) |


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
