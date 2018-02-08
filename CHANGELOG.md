# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Unreleased
### Added

### Changed

### Deprecated

### Removed

### Fixed
- パフォーマンス集計が毎秒の仕様であるのに対して、処理時間が数分、という状況に対して、処理自体をチューニング。

### Security


## v12.1.2 - 2018-02-02
### Fixed
- 同じ上演日で購入番号が重複するバグを修正。
- クレジットカード決済のない注文の返品処理が完了しないバグを修正。

## v12.1.1 - 2018-02-01
### Fixed
- 購入者情報として日本以外の国の電話番号が登録できないバグを修正。

## v12.1.0 - 2018-01-18
### Added
- 健康診断サービスを追加。
- 取引ダウンロードサービスを追加。

## v12.0.0 - 2018-01-17
### Added
- 注文取引サービス、在庫状況サービス、在庫サービス、売上サービス、通知サービス、タスクサービスを追加。
- パフォーマンスに対する返品タスクを追加。
- パフォーマンスと在庫保管メソッドをレポジトリーに追加。
- 車椅子流入数制限の仕組みを追加。
- 券種カテゴリーレート制限リポジトリーを追加。
- パフォーマンスの券種ごとの在庫状況を更新するサービスを追加。
- トークンリポジトリーを追加。
- パフォーマンス検索サービスを追加。
- パフォーマンス集計データリポジトリーを追加。
- 入場ゲートリポジトリーを追加。
- 管理者サービスを追加。
- 注文作成タスクを追加。
- 販売情報リポジトリーを追加。
- 販売情報サービスを追加。

### Changed
- 取引と在庫スキーマを追加。予約を在庫を明確に分離。
- APIの認証情報をCognitoから取得するように変更。
- 注文返品取引スキーマを追加。
- パフォーマンスIDと在庫IDを文字列に変更。
- 購入番号を6桁に短縮。
- ownerのnameを一言語に限定。
- 購入番号リポジトリーをRedisへ移行。
- 取引にAPIクライアント情報を結合。
- 注文取引結果に印刷トークンを追加。
- 返品タスクに注文ステータス変更処理を追加。

### Removed
- MongoDBからclientsコレクションを削除。
- MongoDBからcustomer_cancel_requestsコレクションを削除。
- メールユーティリティを削除。
- GMO通知ユーティリティを削除。
- 所有者コレクションを削除(ユーザー情報をCognitoへ移行)

### Fixed
- パフォーマンス残席数が0にならないバグを解消。

## v11.2.0 - 2017-07-24
### Added
- mongooseをindexモジュールからエクスポート。
- クライアント作成サンプルを追加。

### Changed
- クライアントスキーマから不要なsecret_saltフィールドを削除。

### Security
- update package [tslint@5.5.0](https://www.npmjs.com/package/tslint)
- update package [typescript@2.4.2](https://www.npmjs.com/package/typescript)

## v10.0.0 - 2017-05-18
### Added
- 変更履歴を追加。
