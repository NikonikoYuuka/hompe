-- ============================================================================
-- 開発用のサンプルデータ
--
--   npm run db:seed:dev
--
-- 目的は「画面を見ながら開発できる状態」を1コマンドで作ること。
-- 表示の分岐を一通り踏むように作ってある:
--   - 4カテゴリ
--   - availability_type の4種
--   - qualification_required の三値（true / false / NULL =「記載を確認できず」）
--   - reward_type の3種（paid / volunteer / unknown）
--   - safety_flags あり / なし、肉体副業メモ あり / なし
--   - status: active / review_required / expired
--
-- **本番に流さないこと。** db:seed:dev は --local 固定にしてある。
-- 日付は実行時に計算するので、いつ流しても「今週末」が正しく入る
-- （SQLite の date() は UTC。JST とは最大9時間ずれるが開発用なので許容）。
-- ============================================================================

delete from analytics_events;
delete from listings;
delete from sources;

-- ---------------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------------
insert into sources
  (id, url, name, entity_name, source_type, grade, status, terms_notes, discovery_origin, notes)
values
  ('11111111-1111-4111-8111-111111111111',
   'https://example-farm.invalid/recruit',
   '（開発用）テスト農園 採用ページ', '株式会社テスト農園',
   'employer_official', 'A', 'active',
   '開発用のダミー。実在しない URL', null, 'db/fixtures/dev.sql で投入'),
  ('22222222-2222-4222-8222-222222222222',
   'https://example-city.invalid/volunteer',
   '（開発用）◯◯市 ボランティア募集', '◯◯市役所 環境課',
   'municipal', 'C', 'active',
   '開発用のダミー。grade C なので自動公開されない想定', null, 'db/fixtures/dev.sql で投入');

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------
insert into listings (
  id, source_id, source_url, title, description, work_type, category, physical_work,
  eligibility_reason, reward_type, pay_text, pay_min, pay_unit, expenses_provided,
  prefecture, city, nearest_station, station_walk_minutes, meeting_point,
  qualification_required, required_qualifications,
  availability_type, event_date, event_end_date, application_deadline,
  work_hours_text, weekend_available, schedule_note,
  editorial_note, purpose_tags, safety_flags,
  status, review_reason, extraction_method, last_verified_at, published_at
) values

-- 1. 今週の土曜・日付確定・資格不要・メモあり（TOP の「今週末」に出る）
('a0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
 'https://example-farm.invalid/recruit/kusakari',
 '週末の草刈り・稲架づくり', '9:00〜12:00 の草刈りと稲架づくりです。単発アルバイト。資格不要。',
 'grass_cutting', 'nature_outdoor', 1, '該当キーワード: 草刈り / 働き方: 日給',
 'paid', '日給8,000円', 8000, 'daily', 1,
 '神奈川県', '平塚市', '平塚駅', 15, '平塚駅北口 集合',
 0, '[]',
 'fixed_date', date('now', 'weekday 6'), null, null,
 '09:00–12:00', 1, null,
 '土曜の朝から3時間、草を刈る。予定が「草刈り」になる週末、なかなかない。',
 '["外に出たい","身体を使いたい"]', '[]',
 'active', null, 'rule', datetime('now'), datetime('now')),

-- 2. 今週の日曜・ボランティア（無償）・地域活動
('a0000002-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
 'https://example-city.invalid/volunteer/river',
 '河川清掃ボランティア', '河川敷のごみ拾いと草の刈り取り。軍手・長靴は貸出あり。',
 'environmental_activity', 'volunteer_local', 1, '該当キーワード: 河川清掃 / 働き方: ボランティア',
 'volunteer', null, null, null, 1,
 '東京都', '足立区', '北千住駅', 20, null,
 0, '[]',
 'fixed_date', date('now', 'weekday 0'), null, date('now', '+2 days'),
 '09:00–11:30', 1, null,
 null, '["誰かの役に立ちたい"]', '[]',
 'active', null, 'human', datetime('now'), datetime('now')),

-- 3. 登録制・資格が必要（介護）・安全フラグあり
('a0000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
 'https://example-farm.invalid/recruit/kaigo',
 '登録制の介護補助スタッフ', 'デイサービスでの介助業務。登録制。週1日から勤務可能です。',
 'care', 'help_people', 1, '該当キーワード: 介護 / 働き方: 登録制 / 週1日から',
 'paid', '時給1,400円', 1400, 'hourly', 1,
 '神奈川県', '横浜市', null, null, null,
 1, '["介護職員初任者研修"]',
 'registration', null, null, null,
 null, 1, '土日のシフトあり',
 null, '[]', '["vague_work"]',
 'active', null, 'rule', datetime('now'), datetime('now')),

-- 4. 定期募集・資格要件が「記載を確認できず」（NULL / D-011 の三値）
('a0000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111',
 'https://example-farm.invalid/recruit/hannyu',
 'イベント会場の設営・撤去', '会場設営と撤去。搬入もあります。派遣スタッフ募集。',
 'event_setup', 'move_build_clear', 1, '該当キーワード: 設営 / 働き方: 派遣',
 'paid', '日給12,000円', 12000, 'daily', null,
 '東京都', '江東区', '国際展示場駅', 8, null,
 null, '[]',
 'recurring', null, null, null,
 '08:00–17:00', 1, null,
 '持ち上げて、運んで、終わり。考えることが少ない。',
 '["何も考えたくない"]', '[]',
 'active', null, 'rule', datetime('now'), datetime('now')),

-- 5. 日程不明（unknown）・報酬の記載なし（unknown）
('a0000005-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222',
 'https://example-city.invalid/volunteer/matsuri',
 '地域のお祭り運営の手伝い', 'テント設営、受付、片付けなど。詳細は公式ページをご確認ください。',
 'community_activity', 'volunteer_local', 1, '該当キーワード: お祭り / 働き方: ボランティア',
 'unknown', null, null, null, null,
 '千葉県', '船橋市', null, null, null,
 null, '[]',
 'unknown', null, null, null,
 null, null, null,
 null, '[]', '["missing_contact"]',
 'active', null, 'rule', datetime('now'), datetime('now')),

-- 6. 来週末・遺品整理
('a0000006-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111',
 'https://example-farm.invalid/recruit/ihin',
 '遺品整理の搬出作業', '家財の搬出と仕分け。短期アルバイト。未経験可。',
 'estate_sorting', 'move_build_clear', 1, '該当キーワード: 遺品整理 / 働き方: 短期',
 'paid', '日給11,000円', 11000, 'daily', 1,
 '埼玉県', 'さいたま市', null, null, null,
 null, '[]',
 'fixed_date', date('now', 'weekday 6', '+7 days'), null, null,
 '09:00–16:00', 1, null,
 null, '[]', '[]',
 'active', null, 'rule', datetime('now'), datetime('now')),

-- 7. 複数日開催
('a0000007-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111',
 'https://example-farm.invalid/recruit/shukaku',
 'りんごの収穫（2日間）', '収穫と選果。宿泊・食事つき。単発OK。',
 'harvest', 'nature_outdoor', 1, '該当キーワード: 収穫 / 働き方: 単発',
 'paid', '日給9,500円', 9500, 'daily', 1,
 '長野県', '飯田市', null, null, null,
 0, '[]',
 'fixed_date', date('now', 'weekday 6', '+14 days'), date('now', 'weekday 0', '+15 days'), null,
 '08:00–16:00', 1, '2日間の通し勤務',
 null, '["普段やらないことをしたい"]', '[]',
 'active', null, 'rule', datetime('now'), datetime('now')),

-- 8. 要確認（/admin/review の確認用。公開されない）
('a0000008-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222',
 'https://example-city.invalid/volunteer/seisou',
 '清掃活動スタッフ（要確認の例）', '詳細は公式ページに記載。',
 null, null, null, '身体作業かどうか判定できない',
 'unknown', null, null, null, null,
 null, null, null, null, null,
 null, '[]',
 'unknown', null, null, null,
 null, null, null,
 null, '[]', '["vague_work","unverified_entity"]',
 'review_required',
 'カテゴリを特定できない: 複数カテゴリに該当' || char(10) || 'Source grade C のため自動公開しない',
 'rule', datetime('now'), null),

-- 9. 期限切れ（公開一覧に出ないことの確認用。archive として残す D-004）
('a0000009-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111',
 'https://example-farm.invalid/recruit/owari',
 '（終了）先月の草刈り', '終了した案件。公開一覧に出ないことの確認用。',
 'grass_cutting', 'nature_outdoor', 1, '該当キーワード: 草刈り / 働き方: 単発',
 'paid', '日給8,000円', 8000, 'daily', 1,
 '神奈川県', '平塚市', null, null, null,
 0, '[]',
 'fixed_date', date('now', '-30 days'), null, null,
 '09:00–12:00', 1, null,
 null, '[]', '[]',
 'expired', '開催日 ' || date('now', '-30 days') || ' を過ぎた', 'rule',
 datetime('now', '-30 days'), datetime('now', '-40 days'));

-- 直近の巡回ログ（/admin/sources の表示確認用）
insert into source_checks (source_id, checked_at, http_status, content_hash, changed, attempt, duration_ms, error)
values
  ('11111111-1111-4111-8111-111111111111', datetime('now', '-1 day'), 200, 'devhash1', 0, 1, 320, null),
  ('22222222-2222-4222-8222-222222222222', datetime('now', '-1 day'), 200, 'devhash2', 1, 1, 410, null),
  ('11111111-1111-4111-8111-111111111111', datetime('now', '-8 days'), 500, null, 0, 3, 20000, 'HTTP 500');
