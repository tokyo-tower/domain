<img src="https://motionpicture.jp/images/common/logo_01.svg" alt="motionpicture" title="motionpicture" align="right" height="56" width="98"/>

# 東京タワードメインモデル for Node.js

[![CircleCI](https://circleci.com/gh/motionpicture/ttts-domain.svg?style=svg&circle-token=2659057577162e85a2d91f193282f94ac7780afc)](https://circleci.com/gh/motionpicture/ttts-domain)

node.jsで使用するための東京タワーオンラインチケットシステムのドメインモデルパッケージです。


## Table of contents

* [Usage](#usage)
* [Code Samples](#code-samples)
* [Jsdoc](#jsdoc)
* [License](#license)


## Usage

### Install

```shell
npm install --save @motionpicture/ttts-domain
```

```Javascript
var ttts = require("@motionpicture/ttts-domain");
```

* mongoose default connection
```Javascript
ttts.mongoose.connect();
```

### Environment variables

| Name                | Required | Value         | Purpose          |
| ------------------- | -------- | ------------- | ---------------- |
| `DEBUG`             | false    | ttts-domain:* | Debug            |
| `NPM_TOKEN`         | true     |               | NPM auth token   |
| `GMO_ENDPOINT`      | false    |               | GMO API endpoint |
| `GMO_SITE_ID`       | false    |               | GMO SiteID       |
| `GMO_SITE_PASS`     | false    |               | GMO SitePass     |
| `TTTS_TOKEN_SECRET` | true     |               | トークン検証シークレット   |


## Code Samples

コードサンプルは [example](https://github.com/motionpicture/ttts-domain/tree/master/example) にあります。

## Jsdoc

`npm run doc`でjsdocを作成できます。./docに出力されます。

## License

ISC
