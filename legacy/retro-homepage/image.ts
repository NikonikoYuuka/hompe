export const IMAGE_MAX_WIDTH = Number(process.env.IMAGE_MAX_WIDTH ?? 1280);
export const IMAGE_TARGET_SIZE_KB = Number(process.env.IMAGE_TARGET_SIZE_KB ?? 300);

export async function compressImagePlaceholder(file: File) {
  // Sharp 等のネイティヴライブラリは Node ランタイム上で動作予定。
  // ここではインターフェースのみ定義し、実装は後続フェーズで追加します。
  return file;
}
