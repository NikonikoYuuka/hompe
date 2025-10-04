import { NextResponse } from "next/server";

export async function POST() {
  // TODO: 署名付きURLの発行と画像圧縮処理を実装
  return NextResponse.json({
    success: false,
    message: "image-upload endpoint is not implemented yet"
  });
}
