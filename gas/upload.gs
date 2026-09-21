/**
 * 結婚式 写真・動画アップロード バックエンド
 * ------------------------------------------------------------
 * upload.html から呼ばれ、Google ドライブの指定フォルダへ
 * ファイルを保存するためのアップロード用URLを発行します。
 *
 * 送信者のお名前が渡された場合は、その名前のフォルダを
 * 保存先フォルダの中に作り、そこへ入れていきます。
 * 名前が渡されなかった場合は、これまでどおり直下に入ります。
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
      if (!isMediaRequest(req.name, req.mimeType)) {
        return json({ ok: false, error: '写真と動画のみお送りいただけます' });
      }
      const name = buildFileName(req.name);
      return json({
        ok: true,
        name: name,
        uploadUrl: createResumableSession(name, req.mimeType, folderFor(req.sender)),
      });
    }

    // 2) 本当に保存できたかを確かめる
    if (req.action === 'verify') {
      return json({ ok: true, found: fileExists(req.name, req.sender) });
    }

    // 3) 複数まとめて確かめる（往復を1回で済ませる）
    if (req.action === 'verifyMany') {
      return json({ ok: true, found: foundAmong(req.names, req.sender) });
    }

    return json({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}


/**
 * 送信者の名前のフォルダを返す。なければ作る。
 * 同じ名前の人が同時に送っても二重に作られないよう、作成時だけ鍵をかける。
 */
function folderFor(sender) {
  const label = folderLabel(sender);
  if (!label) return FOLDER_ID;

  const root = DriveApp.getFolderById(FOLDER_ID);

  const found = root.getFoldersByName(label);
  if (found.hasNext()) return found.next().getId();

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    // 待っている間に他の人が作っているかもしれない
    const again = root.getFoldersByName(label);
    if (again.hasNext()) return again.next().getId();

    return root.createFolder(label).getId();
  } catch (err) {
    const retry = root.getFoldersByName(label);
    return retry.hasNext() ? retry.next().getId() : FOLDER_ID;
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}


/** フォルダ名に使えない文字を落とす */
function folderLabel(sender) {
  return String(sender || '')
    .replace(/[\\\/:*?"<>|]/g, '_')
    .replace(/[\r\n\t]/g, ' ')
    .trim()
    .slice(0, 40);
}


/** Drive に「これから受け取る」と伝え、専用のアップロードURLを発行してもらう */
function createResumableSession(name, mimeType, folderId) {
  if (FOLDER_ID.indexOf('PASTE_YOUR') === 0) {
    throw new Error('FOLDER_ID がまだ設定されていません');
  }

  const metadata = {
    name: name,
    parents: [folderId || FOLDER_ID],
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


/**
 * 写真か動画かを判定する。
 * ページ側でも弾いているが、ページを経由しない送信を防ぐためここでも見る。
 * 端末によっては種類が空で届くので、その場合は拡張子で判断する。
 */
const MEDIA_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|tiff?|heic|heif|mov|mp4|m4v|3gp|avi|mkv|webm|mpe?g|wmv)$/i;

function isMediaRequest(name, mimeType) {
  const t = String(mimeType || '').toLowerCase();
  if (t.indexOf('image/') === 0 || t.indexOf('video/') === 0) return true;
  if (!t || t === 'application/octet-stream') {
    return MEDIA_EXT.test(String(name || ''));
  }
  return false;
}


/** 指定した名前のファイルが、その送信者のフォルダに存在するか */
function fileExists(name, sender) {
  if (!name) return false;
  const folder = DriveApp.getFolderById(folderFor(sender));
  return folder.getFilesByName(name).hasNext();
}


/**
 * 渡された名前のうち、そのフォルダに実在するものだけを返す。
 * フォルダを1回なめるだけなので、名前の数が増えても往復は1回で済む。
 */
function foundAmong(names, sender) {
  const want = {};
  let remaining = 0;
  (names || []).forEach(function (n) {
    if (n && !want[n]) { want[n] = true; remaining++; }
  });
  if (!remaining) return [];

  const folder = DriveApp.getFolderById(folderFor(sender));
  const files = folder.getFiles();
  const found = [];
  let scanned = 0;

  while (files.hasNext() && remaining > 0 && scanned < 5000) {
    const name = files.next().getName();
    scanned++;
    if (want[name]) {
      found.push(name);
      delete want[name];
      remaining--;
    }
  }
  return found;
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
  const url = createResumableSession(name, 'text/plain', FOLDER_ID);
  Logger.log('アップロードURLの発行: 成功');

  // 中身を送らなければファイルにはなりません。念のため取り消します。
  UrlFetchApp.fetch(url, { method: 'delete', muteHttpExceptions: true });

  Logger.log('セットアップ完了。ページから使えます。');
}
