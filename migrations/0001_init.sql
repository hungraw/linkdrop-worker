CREATE TABLE links (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_links_created_at ON links(created_at DESC);
