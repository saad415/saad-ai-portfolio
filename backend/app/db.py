import os
import psycopg2
import psycopg2.pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager

_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def init_pool() -> None:
    global _pool
    _pool = psycopg2.pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=5,
        dsn=os.environ["DATABASE_URL"],
    )


@contextmanager
def get_cursor():
    assert _pool is not None, "DB pool not initialised"
    conn = _pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def create_tables() -> None:
    with get_cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS annotation_cases (
                id                TEXT PRIMARY KEY,
                modality          TEXT,
                region            TEXT,
                status            TEXT        NOT NULL DEFAULT 'unreviewed',
                notes             TEXT        NOT NULL DEFAULT '',
                volume_url        TEXT,
                volume_file_name  TEXT,
                volume_dims       JSONB,
                created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS annotation_landmarks (
                id         TEXT        PRIMARY KEY,
                case_id    TEXT        NOT NULL REFERENCES annotation_cases(id) ON DELETE CASCADE,
                label      TEXT        NOT NULL,
                plane      TEXT        NOT NULL,
                slice      INTEGER     NOT NULL,
                x          FLOAT       NOT NULL,
                y          FLOAT       NOT NULL,
                radius     FLOAT       NOT NULL,
                name       TEXT,
                color      TEXT,
                tool       TEXT        NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS annotation_segmentation_strokes (
                id         TEXT        PRIMARY KEY,
                case_id    TEXT        NOT NULL REFERENCES annotation_cases(id) ON DELETE CASCADE,
                label      TEXT        NOT NULL,
                plane      TEXT        NOT NULL,
                slice      INTEGER     NOT NULL,
                x          FLOAT       NOT NULL,
                y          FLOAT       NOT NULL,
                radius     FLOAT       NOT NULL,
                source     TEXT        NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS annotation_versions (
                id                   SERIAL      PRIMARY KEY,
                case_id              TEXT        NOT NULL,
                version_number       INT         NOT NULL,
                status               TEXT        NOT NULL DEFAULT 'in-progress',
                notes                TEXT        NOT NULL DEFAULT '',
                annotations          JSONB       NOT NULL DEFAULT '[]',
                segmentations        JSONB       NOT NULL DEFAULT '[]',
                annotation_count     INT         NOT NULL DEFAULT 0,
                segmentation_count   INT         NOT NULL DEFAULT 0,
                created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
