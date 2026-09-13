import type { Metadata } from "next";
import { fetchRecentChecks, fetchSources } from "../../../../lib/admin-data";
import { SOURCE_GRADE_LABELS, SOURCE_TYPE_LABELS, formatVerifiedAt } from "../../../../lib/labels";

export const metadata: Metadata = { title: "Source 一覧", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Source の状態と直近の巡回結果 (spec §32) */
export default async function AdminSourcesPage() {
  const [sources, checks] = await Promise.all([fetchSources(), fetchRecentChecks(30)]);

  const byId = new Map(sources.map((source) => [source.id, source]));

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-50">Source</h1>
      <p className="mt-1 text-sm text-ink-400">{sources.length} 件</p>

      <ul className="mt-6 space-y-3">
        {sources.map((source) => (
          <li key={source.id} className="rounded-lg border border-ink-800 bg-ink-900 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
              <span className="rounded bg-ink-800 px-2 py-0.5 text-ink-200">
                grade {source.grade}
              </span>
              <span>{SOURCE_TYPE_LABELS[source.source_type]}</span>
              <span>{source.status}</span>
              {source.consecutive_failures > 0 && (
                <span className="text-sweat-400">連続失敗 {source.consecutive_failures}</span>
              )}
            </div>
            <p className="mt-2 text-sm font-bold text-ink-50">{source.name}</p>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block break-all text-xs text-ink-400 underline hover:text-ink-200"
            >
              {source.url}
            </a>
            <p className="mt-2 text-xs text-ink-400">
              最終チェック：{formatVerifiedAt(source.checked_at) ?? "未実施"}
              {source.changed_at && ` / 最終変更：${formatVerifiedAt(source.changed_at)}`}
              {source.last_http_status && ` / HTTP ${source.last_http_status}`}
            </p>
            <p className="mt-1 text-xs text-ink-400">{SOURCE_GRADE_LABELS[source.grade]}</p>
            {source.terms_notes && (
              <p className="mt-1 text-xs text-ink-400">terms: {source.terms_notes}</p>
            )}
            {source.discovery_origin && (
              <p className="mt-1 text-xs text-ink-400">
                discovery: {source.discovery_origin}（Fact 取得元ではない）
              </p>
            )}
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-sm font-bold text-ink-50">直近の巡回ログ</h2>
      <ul className="mt-3 divide-y divide-ink-800 text-xs">
        {checks.map((check) => (
          <li key={check.id} className="flex flex-wrap gap-3 py-2 text-ink-400">
            <span className="tabular-nums">{formatVerifiedAt(check.checked_at)}</span>
            <span className="text-ink-200">{byId.get(check.source_id)?.name ?? check.source_id}</span>
            <span>{check.http_status ?? "-"}</span>
            <span className={check.changed ? "text-sweat-400" : ""}>
              {check.changed ? "changed" : "unchanged"}
            </span>
            {check.error && <span className="text-sweat-400">{check.error}</span>}
          </li>
        ))}
      </ul>
      {checks.length === 0 && (
        <p className="mt-3 text-sm text-ink-400">
          まだ巡回していません。`npm run ops:check` を実行してください。
        </p>
      )}
    </div>
  );
}
