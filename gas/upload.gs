/**
 * 結婚式 写真・動画アップロード バックエンド
 * ------------------------------------------------------------
 * upload.html から呼ばれ、Google ドライブの指定フォルダへ
 * ファイルを保存するためのアップロード用URLを発行します。
 *
 * ファイル本体は GAS を通らず、ブラウザから Google へ直接送られます。
 * そのため大きな動画でもサイズ制限に引っかかりません。
 *
 * ただし Google はアップロード完了の応答に
 * Access-Control-Allow-Origin を付けてこないため、
 * ブラウザ側は成功しても結果を読めません。
 * そこで action:'verify' で保存できたかを問い合わせられるようにしています。
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

    // 1) アップロード先のURLを発行する
    if (req.action === 'start') {
      const name = buildFileName(req.name);
      return json({
        ok: true,
        name: name,
        uploadUrl: createResumableSession(name, req.mimeType),
      });
    }

    // 2) 本当に保存できたかを確かめる
    if (req.action === 'verify') {
      return json({ ok: true, found: fileExists(req.name) });
    }

    return json({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}


/** Drive に「これから受け取る」と伝え、専用のアップロードURLを発行してもらう */
function createResumableSession(name, mimeType) {
  if (FOLDER_ID.indexOf('PASTE_YOUR') === 0) {
    throw new Error('FOLDER_ID がまだ設定されていません');
  }

  const metadata = {
    name: name,
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


/** 指定した名前のファイルがフォルダに存在するか */
function fileExists(name) {
  if (!name) return false;
  const folder = DriveApp.getFolderById(FOLDER_ID);
  return folder.getFilesByName(name).hasNext();
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
 * 実行ログに「セットアップ完了」と出れば成功です。
 */
function setupCheck() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  Logger.log('保存先フォルダ: ' + folder.getName());

  const name = buildFileName('setup_test.txt');
  const url = createResumableSession(name, 'text/plain');
  Logger.log('アップロードURLの発行: 成功');

  // 中身を送らなければファイルにはなりません。念のため取り消します。
  UrlFetchApp.fetch(url, { method: 'delete', muteHttpExceptions: true });

  Logger.log('セットアップ完了。ページから使えます。');
}
