# legacy / retro-homepage

このディレクトリは、branch `claude/nikutai-fukugyou-mvp-7f21z8` で
プロダクトを **肉体副業** に切り替えた際に退避した、元の
「Retro Homepage Builder」scaffold です。

`main` には元の配置のまま残っています。削除ではなく退避なので、
別リポジトリへ分離する場合はここから復元できます。

## 元の配置

| 現在 | 元 |
| --- | --- |
| `legacy/retro-homepage/auth/` | `app/(auth)/` |
| `legacy/retro-homepage/dashboard/` | `app/(dashboard)/` |
| `legacy/retro-homepage/api-diary/` | `app/api/diary/` |
| `legacy/retro-homepage/page.tsx` | `app/page.tsx` |
| `legacy/retro-homepage/image.ts` | `lib/image.ts` |
| `legacy/retro-homepage/supabase-client.ts` | `lib/supabase-client.ts` |

`supabase/migrations/0001_diary_entries.sql` は移動していません。
肉体副業用の Supabase プロジェクトでは `0002` のみ適用してください。

このディレクトリは Next.js のルーティング対象外であり、ビルドにも含まれません。
