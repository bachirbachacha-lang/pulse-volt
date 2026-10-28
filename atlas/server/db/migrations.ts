// Append-only list. Never edit a migration that has shipped; add a new one.
export const MIGRATIONS: string[] = [
  /* 1: core */ `
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

  CREATE TABLE workspaces (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE projects (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','done','archived')),
    color TEXT NOT NULL DEFAULT 'cyan',
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
    workspace_subpath TEXT NOT NULL DEFAULT '',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    due_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE INDEX tasks_project ON tasks(project_id, status);

  CREATE TABLE activity (
    id INTEGER PRIMARY KEY,
    ts TEXT NOT NULL,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    message TEXT NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    meta TEXT
  );
  CREATE INDEX activity_ts ON activity(ts DESC);

  CREATE TABLE app_log (
    id INTEGER PRIMARY KEY,
    ts TEXT NOT NULL,
    level TEXT NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL
  );

  CREATE TABLE notes (
    id INTEGER PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    kind TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('note','doc','diagram')),
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE VIRTUAL TABLE notes_fts USING fts5(title, body, tags, content='notes', content_rowid='id');
  CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(rowid, title, body, tags) VALUES (new.id, new.title, new.body, new.tags);
  END;
  CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, body, tags) VALUES ('delete', old.id, old.title, old.body, old.tags);
  END;
  CREATE TRIGGER notes_au AFTER UPDATE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, body, tags) VALUES ('delete', old.id, old.title, old.body, old.tags);
    INSERT INTO notes_fts(rowid, title, body, tags) VALUES (new.id, new.title, new.body, new.tags);
  END;

  CREATE TABLE experiments (
    id INTEGER PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    hypothesis TEXT NOT NULL DEFAULT '',
    method TEXT NOT NULL DEFAULT '',
    result TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','running','succeeded','failed','inconclusive')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE calculations (
    id INTEGER PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    label TEXT NOT NULL DEFAULT '',
    expression TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE conversations (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user','assistant')),
    content TEXT NOT NULL,
    provider TEXT,
    raw TEXT,
    tool_events TEXT,
    attachments TEXT,
    error TEXT,
    usage TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX messages_conv ON messages(conversation_id, id);

  CREATE TABLE script_runs (
    id INTEGER PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    cwd TEXT NOT NULL,
    label TEXT NOT NULL,
    command TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running','succeeded','failed','cancelled')),
    exit_code INTEGER,
    log TEXT NOT NULL DEFAULT '',
    started_at TEXT NOT NULL,
    finished_at TEXT
  );

  CREATE TABLE boards (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'moodboard' CHECK (kind IN ('moodboard','references','ui-concept','assets')),
    description TEXT NOT NULL DEFAULT '',
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE assets (
    id INTEGER PRIMARY KEY,
    area TEXT NOT NULL DEFAULT 'design' CHECK (area IN ('design','engineering')),
    board_id INTEGER REFERENCES boards(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    stored_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    tags TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'upload',
    created_at TEXT NOT NULL
  );

  CREATE TABLE datasets (
    id INTEGER PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    interval TEXT NOT NULL DEFAULT '1d',
    created_at TEXT NOT NULL
  );
  CREATE TABLE bars (
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    ts TEXT NOT NULL,
    open REAL NOT NULL, high REAL NOT NULL, low REAL NOT NULL, close REAL NOT NULL,
    volume REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (dataset_id, ts)
  );

  CREATE TABLE backtests (
    id INTEGER PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    strategy TEXT NOT NULL,
    params TEXT NOT NULL,
    metrics TEXT NOT NULL,
    equity TEXT NOT NULL,
    trades TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE paper_accounts (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    starting_cash REAL NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE paper_orders (
    id INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('buy','sell')),
    qty REAL NOT NULL CHECK (qty > 0),
    price REAL NOT NULL CHECK (price > 0),
    fee REAL NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    ts TEXT NOT NULL
  );
  CREATE TABLE paper_quotes (
    account_id INTEGER NOT NULL REFERENCES paper_accounts(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    price REAL NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (account_id, symbol)
  );

  CREATE TABLE automations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    config TEXT NOT NULL,
    schedule TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_run_at TEXT,
    next_run_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE jobs (
    id INTEGER PRIMARY KEY,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
    result TEXT,
    error TEXT,
    log TEXT NOT NULL DEFAULT '',
    automation_id INTEGER REFERENCES automations(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
  );
  CREATE INDEX jobs_status ON jobs(status, id);
  `,
];
