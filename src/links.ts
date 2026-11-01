export type Link = {
  id: string;
  url: string;
  createdAt: string;
};

type LinkRow = {
  id: string;
  url: string;
  created_at: string;
};

function linkFromRow(row: LinkRow): Link {
  return { id: row.id, url: row.url, createdAt: new Date(row.created_at).toISOString() };
}

export async function listLinks(db: D1Database): Promise<Link[]> {
  const result = await db.prepare(
    'SELECT id, url, created_at FROM links ORDER BY created_at DESC LIMIT 100',
  ).all<LinkRow>();
  return result.results.map(linkFromRow);
}

export async function createLink(db: D1Database, url: string): Promise<{ link: Link; created: boolean }> {
  const recent = await db.prepare(
    'SELECT id, url, created_at FROM links WHERE url = ? ORDER BY created_at DESC LIMIT 1',
  ).bind(url).first<LinkRow>();

  if (recent && Date.now() - Date.parse(recent.created_at) <= 45_000) {
    return { link: linkFromRow(recent), created: false };
  }

  const link = { id: crypto.randomUUID(), url, createdAt: new Date().toISOString() };
  await db.prepare('INSERT INTO links (id, url, created_at) VALUES (?, ?, ?)')
    .bind(link.id, link.url, link.createdAt).run();
  return { link, created: true };
}

export async function deleteLink(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}
