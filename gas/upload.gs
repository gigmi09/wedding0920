/**
 * 結婚式 写真・動画アップロード バックエンド
 * ------------------------------------------------------------
 * upload.html から呼ばれ、Google ドライブの指定フォルダへ
 * ファイルを保存するためのアップロード用URLを発行します。
 *
 * ファイル本体は GAS を通らず、ブラウザから Google へ直接送られます。
 * そのため大きな動画でもサイズ制限に引っかかりません。
 * ------------------------------------------------------------
 */

// 保存先の Google ドライブ フォルダ ID
// フォルダを開いたときの URL の /folders/ より後ろの文字列
const FOLDER_ID = 'PASTE_YOUR_DRIVE_FOLDER_ID_HERE';


/** 動作確認用（ブラウザで URL を開いたときに表示される） */
function doGet() {
  return json({ ok: true, message: 'upload endpoint ready' });
}


/** upload.html からの依頼を受け取る */
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);

    if (req.action === 'start') {
      return json({
        ok: true,
        uploadUrl: createResumableSession(req.name, req.mimeType),
      });
    }

    return json({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}


/** Drive に「これから受け取る」と伝え、専用のアップロードURLを発行してもらう */
function createResumableSession(rawName, mimeType) {
  if (FOLDER_ID.indexOf('PASTE_YOUR') === 0) {
    throw new Error('FOLDER_ID がまだ設定されていません');
  }

  const metadata = {
    name: buildFileName(rawName),
    parents: [FOLDER_ID],
  };

  const res = UrlFetchApp.fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    {
      method: 'post',
      contentType: 'application/json; charset=UTF-8',
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
        'X-Upload-Content-Type': mimeType || 'application/octet-stream',
      },
      payload: JSON.stringify(metadata),
      followRedirects: false,
      muteHttpExceptions: true,
    }
  );

  const code = res.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('Drive session error ' + code + ': ' + res.getContentText());
  }

  const headers = res.getAllHeaders();
  const location = headers['Location'] || headers['location'];
  if (!location) {
    throw new Error('アップロードURLが取得できませんでした');
  }
  return location;
}


/** 送信日時を頭に付けて、名前の重複と並び順の乱れを防ぐ */
function buildFileName(rawName) {
  const stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmmss');
  const safe = String(rawName || 'file').replace(/[\\\/:*?"<>|]/g, '_').slice(-80);
  return stamp + '_' + safe;
}


function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * 初回とスコープ変更後に、エディタから手動で 1 回実行してください。
 *
 * 1. FOLDER_ID が正しいか
 * 2. ドライブへの「書き込み」権限が下りているか
 * の両方を確認します。実行ログに「セットアップ完了」と出れば成功です。
 *
 * 権限の確認画面が出たら承認してください。承認を求められずに
 * 403 insufficient authentication scopes が出る場合は、
 * appsscript.json の oauthScopes が反映されていません。
 */
function setupCheck() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  Logger.log('保存先フォルダ: ' + folder.getName());

  // 実際に書き込み用のアップロードURLを発行して、権限まで確かめる
  const url = createResumableSession('setup_test.txt', 'text/plain');
  Logger.log('アップロードURLの発行: 成功');

  // 発行しただけのセッションは中身を送らなければファイルになりません。
  // 念のため明示的に取り消しておきます。
  UrlFetchApp.fetch(url, { method: 'delete', muteHttpExceptions: true });

  Logger.log('セットアップ完了。ページから使えます。');
}
