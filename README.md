# TTTS Domain Library for Node.js

[![CircleCI](https://circleci.com/gh/tokyo-tower/domain.svg?style=svg)](https://circleci.com/gh/tokyo-tower/domain)

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
| `TTTS_TOKEN_SECRET`               | true     |               | トークン検証シークレット                  |
| `AZURE_STORAGE_CONNECTION_STRING` | true     |               | ファイル保管用のazureストレージ接続文字列 |
| `CHEVRE_AUTHORIZE_SERVER_DOMAIN`  | true     |               | Chevre API Settings                       |
| `CHEVRE_CLIENT_ID`                | true     |               | Chevre API Settings                       |
| `CHEVRE_CLIENT_SECRET`            | true     |               | Chevre API Settings                       |
| `PROJECT_ID`                      | true     |               | Project ID                                |

## License

ISC
