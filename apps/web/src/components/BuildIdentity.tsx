const commit = __BUILD_COMMIT__
const timestamp = __BUILD_TIMESTAMP__

export const buildIdentity = {
  commit,
  shortCommit: commit === 'unknown' ? commit : commit.slice(0, 8),
  timestamp,
  formattedTimestamp: Number.isNaN(Date.parse(timestamp))
    ? timestamp
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(timestamp)) + ' UTC',
}

export function BuildIdentity({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="sidebar-build" title={`Built ${buildIdentity.formattedTimestamp}`}>
        Build {buildIdentity.shortCommit}
      </div>
    )
  }

  return (
    <dl className="build-details">
      <div><dt>Commit</dt><dd><code>{buildIdentity.commit}</code></dd></div>
      <div><dt>Built</dt><dd><time dateTime={buildIdentity.timestamp}>{buildIdentity.formattedTimestamp}</time></dd></div>
    </dl>
  )
}
