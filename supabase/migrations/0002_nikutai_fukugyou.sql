-- ============================================================================
-- 肉体副業 (Nikutai Fukugyou) V0.1 schema
--
-- 設計方針は docs/02_DECISIONS.md を参照。要点:
--   - Fact カラムには Source 由来の事実のみを入れる (D-006)
--   - expired / closed は物理削除せず archive として保持する (D-004)
--   - availability_type で「今週末働ける」と「土日勤務可能」を区別する (D-005)
--   - 公開側の読み取りのみ anon に許可し、書き込みは service role 限定
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUMs
-- ---------------------------------------------------------------------------
do $$
begin
  -- Fact 取得元の種別。第三者求人媒体は Production Fact Source にしない (D-002)
  if not exists (select 1 from pg_type where typname = 'source_type') then
    create type source_type as enum (
      'employer_official',   -- 雇用主公式サイト / 公式採用ページ
      'employer_ats',        -- 公式サイトから正式にリンクされた企業専用 ATS
      'municipal',           -- 自治体
      'public_agency',       -- 公的機関
      'npo',                 -- NPO
      'organizer',           -- 主催者
      'permitted',           -- 明示的許可を得た Source
      'direct_post'          -- 将来の企業直接掲載
    );
  end if;

  -- Source Gate の grade (docs/03_SOURCE_POLICY.md)
  if not exists (select 1 from pg_type where typname = 'source_grade') then
    create type source_grade as enum ('A', 'B', 'C', 'D');
  end if;

  if not exists (select 1 from pg_type where typname = 'source_status') then
    create type source_status as enum ('active', 'paused', 'blocked');
  end if;

  -- ユーザー向けカテゴリは4つだけ (D-008)
  if not exists (select 1 from pg_type where typname = 'listing_category') then
    create type listing_category as enum (
      'nature_outdoor',   -- 自然・外仕事
      'move_build_clear', -- 運ぶ・作る・片付ける
      'help_people',      -- 人を手伝う
      'volunteer_local'   -- ボランティア・地域活動
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'availability_type') then
    create type availability_type as enum ('fixed_date', 'recurring', 'registration', 'unknown');
  end if;

  if not exists (select 1 from pg_type where typname = 'reward_type') then
    create type reward_type as enum ('paid', 'volunteer', 'unknown');
  end if;

  if not exists (select 1 from pg_type where typname = 'listing_status') then
    create type listing_status as enum (
      'draft',
      'review_required',
      'scheduled',
      'active',
      'expired',
      'closed'
    );
  end if;

  -- 将来 'ai' を足せるようにしておく (docs/06_FUTURE_DESIGN.md)
  if not exists (select 1 from pg_type where typname = 'extraction_method') then
    create type extraction_method as enum ('rule', 'human');
  end if;

  if not exists (select 1 from pg_type where typname = 'analytics_event_type') then
    create type analytics_event_type as enum ('page_view', 'listing_view', 'official_source_click');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------------
create table if not exists public.sources (
  id                uuid primary key default gen_random_uuid(),
  url               text not null unique,          -- Production Fact 取得元 URL
  name              text not null,                 -- 表示用の Source 名
  entity_name       text,                          -- 募集主体（会社 / 団体名）
  source_type       source_type not null,
  grade             source_grade not null default 'C',
  status            source_status not null default 'active',

  -- Source Gate の記録 (docs/03_SOURCE_POLICY.md)
  acquisition_method text not null default 'http_fetch', -- http_fetch / rss / api / manual
  terms_url          text,
  terms_notes        text,      -- automated access / commercial use / reuse / AI processing / image reuse
  robots_notes       text,      -- robots.txt は terms とは別問題として別カラムで持つ
  permission_notes   text,      -- 明示的許可の内容と取得日
  removal_contact    text,      -- 更新 / 削除要請の連絡先

  -- Discovery は Fact 取得元ではない (D-002)。発見経路のメモとしてのみ保持する
  discovery_origin  text,

  -- 巡回設定 / 状態
  adapter           text not null default 'generic',  -- sources/registry.ts のキー (D-013)
  content_selector  text,       -- 本文領域を絞る場合のヒント（未使用可）
  checked_at        timestamptz,
  changed_at        timestamptz,
  last_http_status  int,
  last_content_hash text,
  consecutive_failures int not null default 0,

  notes             text,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

create index if not exists idx_sources_status on public.sources (status, grade);

-- ---------------------------------------------------------------------------
-- listings
--   fact_* 系のカラムには Source に存在した事実のみを入れる。
--   編集コピーは editorial_note にのみ入れる (D-006)。
-- ---------------------------------------------------------------------------
create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references public.sources (id) on delete restrict,
  source_url  text not null,               -- この Listing の Fact 取得元（ページ単位）

  -- ---- Fact layer ----
  title       text not null,
  description text,                        -- Source 記載の仕事内容（事実のみ）
  work_type   text,                        -- 詳細な work type（例: grass_cutting, event_setup）
  category    listing_category,            -- 公開側の4カテゴリ (D-008)
  physical_work boolean,                   -- 仕事内容ベースで判定 (D-007)。不明は null
  eligibility_reason text,                 -- physical_work 判定の根拠（監査用）

  -- 報酬
  reward_type       reward_type not null default 'unknown',
  pay_text          text,                  -- Source の表記そのまま
  pay_min           int,
  pay_max           int,
  pay_unit          text,                  -- hourly / daily / per_task
  expenses_provided boolean,               -- 交通費等の支給
  benefits_text     text,                  -- 食事・宿泊等（Source 記載時のみ）

  -- 場所（全国展開を妨げない。MVP では埋まらなくてよい）
  prefecture          text,
  city                text,
  address             text,
  postal_code         text,
  latitude            double precision,
  longitude           double precision,
  nearest_station     text,
  station_walk_minutes int,
  car_allowed         boolean,
  pickup_available    boolean,
  meeting_point       text,

  -- 資格。Source が明示していない限り「無資格可」と推論しない (D-011)
  qualification_required  boolean,
  required_qualifications text[] not null default '{}',

  -- 日程 / 募集形態 (D-005)
  availability_type    availability_type not null default 'unknown',
  event_date           date,
  event_end_date       date,
  application_deadline date,
  work_hours_text      text,
  weekend_available    boolean,            -- 土日に働けると Source が明示している場合のみ true
  schedule_note        text,

  -- ---- Editorial layer ----
  editorial_note text,                     -- 肉体副業メモ。人間記入・任意。存在時のみ表示
  purpose_tags   text[] not null default '{}',  -- 人間が付与する editorial tag (D-009)

  -- ---- Safety / lifecycle ----
  safety_flags text[] not null default '{}',
  status       listing_status not null default 'draft',
  review_reason text,                      -- review_required になった理由
  extraction_method extraction_method not null default 'rule',
  fact_hash    text,                       -- 確定 Fact のハッシュ（Fact Cache 用 D-014）
  last_verified_at timestamptz,            -- 最後に Source で事実を確認した時刻
  published_at timestamptz,
  closed_at    timestamptz,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_listings_source_url on public.listings (source_url);
create index if not exists idx_listings_public on public.listings (status, category)
  where status = 'active';
create index if not exists idx_listings_review on public.listings (status)
  where status = 'review_required';
create index if not exists idx_listings_dates on public.listings (event_date, application_deadline);

-- ---------------------------------------------------------------------------
-- source_checks : 巡回ログ。Code First の変更検知結果 (docs/05_OPERATIONS.md)
-- ---------------------------------------------------------------------------
create table if not exists public.source_checks (
  id           bigserial primary key,
  source_id    uuid not null references public.sources (id) on delete cascade,
  checked_at   timestamptz not null default timezone('utc', now()),
  http_status  int,
  content_hash text,
  changed      boolean not null default false,
  attempt      int not null default 1,      -- 5xx の retry 回数。即 closed にしないため
  duration_ms  int,
  error        text
);

create index if not exists idx_source_checks_source on public.source_checks (source_id, checked_at desc);
create index if not exists idx_source_checks_checked_at on public.source_checks (checked_at desc);

-- ---------------------------------------------------------------------------
-- analytics_events : Demand Validation 用。個人情報を収集しない
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id           bigserial primary key,
  event_type   analytics_event_type not null,
  listing_id   uuid references public.listings (id) on delete set null,
  path         text,
  anon_session text,                        -- ランダム UUID。個人を特定しない
  created_at   timestamptz not null default timezone('utc', now())
);

create index if not exists idx_analytics_type_time on public.analytics_events (event_type, created_at desc);
create index if not exists idx_analytics_listing on public.analytics_events (listing_id, event_type);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_sources_updated_at on public.sources;
create trigger set_sources_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

drop trigger if exists set_listings_updated_at on public.listings;
create trigger set_listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--   anon に許すのは「公開中 Listing の読み取り」と「analytics の書き込み」だけ。
--   運用スクリプトと /admin は service role key を使う（RLS を bypass する）。
-- ---------------------------------------------------------------------------
alter table public.sources          enable row level security;
alter table public.listings         enable row level security;
alter table public.source_checks    enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "listings_public_read" on public.listings;
create policy "listings_public_read"
  on public.listings
  for select
  using (status = 'active');

-- sources / source_checks は anon に公開しない（policy を作らない = 全拒否）

drop policy if exists "analytics_anon_insert" on public.analytics_events;
create policy "analytics_anon_insert"
  on public.analytics_events
  for insert
  with check (true);
