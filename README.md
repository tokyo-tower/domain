# 東京タワードメインモデル for Node.js

[![CircleCI](https://circleci.com/gh/tokyo-tower/domain.svg?style=svg)](https://circleci.com/gh/tokyo-tower/domain)

Node.jsで使用するための東京タワーオンラインチケットシステムのドメインモデルパッケージです。

## Table of contents

* [Usage](#usage)
* [License](#license)

## Usage

### Install

```shell
npm install --save @tokyo-tower/domain
```

```Javascript
var ttts = require("@tokyo-tower/domain");
```

* mongoose default connection
```Javascript
ttts.mongoose.connect();
```

### Environment variables

| Name                              | Required | Value         | Purpose                                   |
| --------------------------------- | -------- | ------------- | ----------------------------------------- |
| `DEBUG`                           | false    | ttts-domain:* | Debug                                     |
| `GMO_ENDPOINT`                    | true     |               | GMO API endpoint                          |
| `GMO_SITE_ID`                     | true     |               | GMO SiteID                                |
| `GMO_SITE_PASS`                   | true     |               | GMO SitePass                              |
| `TTTS_TOKEN_SECRET`               | true     |               | トークン検証シークレット                  |
| `AZURE_STORAGE_CONNECTION_STRING` | true     |               | ファイル保管用のazureストレージ接続文字列 |
| `CHEVRE_AUTHORIZE_SERVER_DOMAIN`  | true     |               | Chevre API Settings                       |
| `CHEVRE_CLIENT_ID`                | true     |               | Chevre API Settings                       |
| `CHEVRE_CLIENT_SECRET`            | true     |               | Chevre API Settings                       |
| `PROJECT_ID`                      | true     |               | Project ID                                |

## License

ISC
