-- ============================================================================
-- 肉体副業 (Nikutai Fukugyou) V0.1 schema — Cloudflare D1 (SQLite)
--
-- 設計方針は docs/02_DECISIONS.md を参照。要点:
--   - Fact カラムには Source 由来の事実のみを入れる (D-006)
--   - expired / closed は物理削除せず archive として保持する (D-004)
--   - availability_type で「今週末働ける」と「土日勤務可能」を区別する (D-005)
--
-- SQLite なので Postgres 版と以下が異なる:
--   - enum      → TEXT + CHECK 制約
--   - uuid      → TEXT（アプリ側で crypto.randomUUID() を採番）
--   - text[]    → TEXT（JSON 配列の文字列）
--   - timestamptz → TEXT（ISO 8601 / UTC）
--   - boolean   → INTEGER 0/1（NULL = 「記載を確認できず」の第3状態）
--   - RLS なし  → DB へは Worker / 運用スクリプトからしかアクセスしない。
--                 ブラウザは DB を直接触らない（docs/08_ARCHITECTURE.md）
-- ============================================================================

-- ---------------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------------
create table if not exists sources (
  id                 text primary key,
  url                text not null unique,          -- Production Fact 取得元 URL
  name               text not null,
  entity_name        text,                          -- 募集主体（会社 / 団体名）

  -- 第三者求人媒体は Production Fact Source にしない (D-002)
  source_type        text not null check (source_type in (
                       'employer_official',   -- 雇用主公式サイト / 公式採用ページ
                       'employer_ats',        -- 公式サイトから正式にリンクされた企業専用 ATS
                       'municipal',           -- 自治体
                       'public_agency',       -- 公的機関
                       'npo',                 -- NPO
                       'organizer',           -- 主催者
                       'permitted',           -- 明示的許可を得た Source
                       'direct_post'          -- 将来の企業直接掲載
                     )),
  -- Source Gate の grade (docs/03_SOURCE_POLICY.md)
  grade              text not null default 'C' check (grade in ('A', 'B', 'C', 'D')),
  status             text not null default 'active' check (status in ('active', 'paused', 'blocked')),

  -- Source Gate の記録
  acquisition_method text not null default 'http_fetch',
  terms_url          text,
  terms_notes        text,   -- automated access / commercial use / reuse / AI processing / image reuse
  robots_notes       text,   -- robots.txt は terms とは別問題として別カラムで持つ
  permission_notes   text,
  removal_contact    text,

  -- Discovery は Fact 取得元ではない (D-002)。発見経路のメモとしてのみ保持する
  discovery_origin   text,

  -- 巡回設定 / 状態
  adapter            text not null default 'generic',  -- sources/registry.ts のキー (D-013)
  content_selector   text,
  checked_at         text,
  changed_at         text,
  last_http_status   integer,
  last_content_hash  text,
  consecutive_failures integer not null default 0,

  notes              text,
  created_at         text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at         text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_sources_status on sources (status, grade);
create index if not exists idx_sources_checked_at on sources (checked_at);

-- ---------------------------------------------------------------------------
-- listings
--   fact 系のカラムには Source に存在した事実のみを入れる。
--   編集コピーは editorial_note にのみ入れる (D-006)。
-- ---------------------------------------------------------------------------
create table if not exists listings (
  id          text primary key,
  source_id   text not null references sources (id),
  source_url  text not null unique,        -- この Listing の Fact 取得元（ページ単位）

  -- ---- Fact layer ----
  title       text not null,
  description text,                        -- Source 記載の仕事内容（事実のみ）
  work_type   text,                        -- 詳細な work type（例: grass_cutting）
  -- 公開側の4カテゴリ (D-008)
  category    text check (category is null or category in (
                'nature_outdoor', 'move_build_clear', 'help_people', 'volunteer_local'
              )),
  physical_work integer,                   -- 仕事内容ベースで判定 (D-007)。NULL = 不明
  eligibility_reason text,

  -- 報酬
  reward_type       text not null default 'unknown'
                      check (reward_type in ('paid', 'volunteer', 'unknown')),
  pay_text          text,                  -- Source の表記そのまま
  pay_min           integer,
  pay_max           integer,
  pay_unit          text,                  -- hourly / daily / per_task
  expenses_provided integer,               -- 交通費等の支給。NULL = 記載なし
  benefits_text     text,

  -- 場所（全国展開を妨げない。MVP では埋まらなくてよい）
  prefecture           text,
  city                 text,
  address              text,
  postal_code          text,
  latitude             real,
  longitude            real,
  nearest_station      text,
  station_walk_minutes integer,
  car_allowed          integer,
  pickup_available     integer,
  meeting_point        text,

  -- 資格。Source が明示していない限り「無資格可」と推論しない (D-011)
  qualification_required  integer,
  required_qualifications text not null default '[]',   -- JSON 配列

  -- 日程 / 募集形態 (D-005)
  availability_type    text not null default 'unknown'
                         check (availability_type in ('fixed_date', 'recurring', 'registration', 'unknown')),
  event_date           text,                -- YYYY-MM-DD
  event_end_date       text,
  application_deadline text,
  work_hours_text      text,
  weekend_available    integer,             -- Source が明示している場合のみ 1
  schedule_note        text,

  -- ---- Editorial layer ----
  editorial_note text,                      -- 肉体副業メモ。人間記入・任意
  purpose_tags   text not null default '[]',-- JSON 配列。人間が付与する (D-009)

  -- ---- Safety / lifecycle ----
  safety_flags text not null default '[]',  -- JSON 配列
  status       text not null default 'draft' check (status in (
                 'draft', 'review_required', 'scheduled', 'active', 'expired', 'closed'
               )),
  review_reason text,
  -- 将来 'ai' を足せるようにしておく (docs/06_FUTURE_DESIGN.md)
  extraction_method text not null default 'rule' check (extraction_method in ('rule', 'human')),
  fact_hash    text,                        -- 確定 Fact のハッシュ（Fact Cache 用 D-014）
  last_verified_at text,
  published_at text,
  closed_at    text,

  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_listings_public on listings (status, category);
create index if not exists idx_listings_source on listings (source_id);
create index if not exists idx_listings_dates on listings (event_date, application_deadline);
create index if not exists idx_listings_updated on listings (updated_at);

-- ---------------------------------------------------------------------------
-- source_checks : 巡回ログ。Code First の変更検知結果 (docs/05_OPERATIONS.md)
-- ---------------------------------------------------------------------------
create table if not exists source_checks (
  id           integer primary key autoincrement,
  source_id    text not null references sources (id) on delete cascade,
  checked_at   text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  http_status  integer,
  content_hash text,
  changed      integer not null default 0,
  attempt      integer not null default 1,  -- 5xx の retry 回数。即 closed にしないため
  duration_ms  integer,
  error        text
);

create index if not exists idx_source_checks_source on source_checks (source_id, checked_at desc);
create index if not exists idx_source_checks_checked_at on source_checks (checked_at desc);

-- ---------------------------------------------------------------------------
-- analytics_events : Demand Validation 用。個人情報を収集しない
-- ---------------------------------------------------------------------------
create table if not exists analytics_events (
  id           integer primary key autoincrement,
  event_type   text not null check (event_type in ('page_view', 'listing_view', 'official_source_click')),
  listing_id   text references listings (id) on delete set null,
  path         text,
  anon_session text,                        -- ランダム UUID。個人を特定しない
  created_at   text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_analytics_type_time on analytics_events (event_type, created_at desc);
create index if not exists idx_analytics_listing on analytics_events (listing_id, event_type);

-- ---------------------------------------------------------------------------
-- updated_at トリガ
-- ---------------------------------------------------------------------------
create trigger if not exists set_sources_updated_at
  after update on sources for each row
begin
  update sources set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;

create trigger if not exists set_listings_updated_at
  after update on listings for each row
begin
  update listings set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') where id = new.id;
end;
