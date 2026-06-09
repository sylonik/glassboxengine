/**
 * ClickHouse DDL for event tables.
 *
 * MergeTree engine with monthly PARTITION BY so old partitions can be
 * dropped cheaply. ORDER BY puts the most selective columns first so
 * queries scoped to a project + time window skip all other data.
 *
 * async_insert on the client side means rows land quickly; ClickHouse
 * merges parts in the background — no need for a client-side buffer.
 */

export const CREATE_DATABASE = `
  CREATE DATABASE IF NOT EXISTS glassbox
`;

export const CREATE_FEEDBACK_EVENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS glassbox.feedback_events
  (
      id           UUID         DEFAULT generateUUIDv4(),
      user_id      String,
      project_id   UUID,
      end_user_id  String,
      product_id   String,
      event_type   LowCardinality(String),
      metadata     String       DEFAULT '{}',
      created_at   DateTime64(3, 'UTC') DEFAULT now64(3)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created_at)
  ORDER BY (project_id, created_at, event_type)
  TTL toDateTime(created_at) + INTERVAL 2 YEAR DELETE
  SETTINGS index_granularity = 8192
`;

export const CREATE_RECOMMENDATION_EVENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS glassbox.recommendation_events
  (
      id             UUID         DEFAULT generateUUIDv4(),
      user_id        String,
      project_id     UUID,
      end_user_id    String,
      item_count     UInt16       DEFAULT 0,
      avg_confidence Float32      DEFAULT 0,
      sliders        String       DEFAULT '{}',
      category       String       DEFAULT '',
      latency_ms     UInt32       DEFAULT 0,
      created_at     DateTime64(3, 'UTC') DEFAULT now64(3)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created_at)
  ORDER BY (project_id, created_at)
  TTL toDateTime(created_at) + INTERVAL 2 YEAR DELETE
  SETTINGS index_granularity = 8192
`;

/**
 * Materialized view that pre-aggregates daily feedback counts.
 * Survives TTL on the raw table — daily rollups are kept forever.
 * Used by the analytics timeline + funnel queries for fast reads.
 */
export const CREATE_DAILY_FEEDBACK_SUMMARY_TARGET = `
  CREATE TABLE IF NOT EXISTS glassbox.daily_feedback_summary
  (
      project_id     UUID,
      event_date     Date,
      event_type     LowCardinality(String),
      event_count    UInt64,
      unique_users   UInt64,
      unique_products UInt64
  )
  ENGINE = SummingMergeTree()
  ORDER BY (project_id, event_date, event_type)
`;

export const CREATE_DAILY_FEEDBACK_SUMMARY_VIEW = `
  CREATE MATERIALIZED VIEW IF NOT EXISTS glassbox.daily_feedback_summary_mv
  TO glassbox.daily_feedback_summary
  AS
  SELECT
      project_id,
      toDate(created_at)          AS event_date,
      event_type,
      count()                     AS event_count,
      uniqExact(end_user_id)      AS unique_users,
      uniqExact(product_id)       AS unique_products
  FROM glassbox.feedback_events
  GROUP BY project_id, event_date, event_type
`;

// ---------------------------------------------------------------------------
// Website event tracking tables
// ---------------------------------------------------------------------------

export const CREATE_WEBSITE_EVENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS glassbox.website_events
  (
      id              UUID              DEFAULT generateUUIDv4(),
      project_id      UUID,
      session_id      String,
      anonymous_id    String,
      user_id         String            DEFAULT '',
      event_name      LowCardinality(String),
      page_url        String            DEFAULT '',
      page_path       LowCardinality(String) DEFAULT '',
      page_title      String            DEFAULT '',
      referrer        String            DEFAULT '',
      utm_source      LowCardinality(String) DEFAULT '',
      utm_medium      LowCardinality(String) DEFAULT '',
      utm_campaign    LowCardinality(String) DEFAULT '',
      device_type     LowCardinality(String) DEFAULT '',
      browser         LowCardinality(String) DEFAULT '',
      os              LowCardinality(String) DEFAULT '',
      screen_width    UInt16            DEFAULT 0,
      screen_height   UInt16            DEFAULT 0,
      country         LowCardinality(String) DEFAULT '',
      properties      String            DEFAULT '{}',
      duration_ms     UInt32            DEFAULT 0,
      created_at      DateTime64(3, 'UTC') DEFAULT now64(3)
  )
  ENGINE = MergeTree()
  PARTITION BY toYYYYMM(created_at)
  ORDER BY (project_id, event_name, created_at, session_id)
  TTL toDateTime(created_at) + INTERVAL 2 YEAR DELETE
  SETTINGS index_granularity = 8192
`;

export const CREATE_DAILY_WEBSITE_SUMMARY_TARGET = `
  CREATE TABLE IF NOT EXISTS glassbox.daily_website_summary
  (
      project_id      UUID,
      event_date      Date,
      event_name      LowCardinality(String),
      event_count     UInt64,
      unique_sessions UInt64,
      unique_users    UInt64
  )
  ENGINE = SummingMergeTree()
  ORDER BY (project_id, event_date, event_name)
`;

export const CREATE_DAILY_WEBSITE_SUMMARY_VIEW = `
  CREATE MATERIALIZED VIEW IF NOT EXISTS glassbox.daily_website_summary_mv
  TO glassbox.daily_website_summary
  AS
  SELECT
      project_id,
      toDate(created_at)          AS event_date,
      event_name,
      count()                     AS event_count,
      uniqExact(session_id)       AS unique_sessions,
      uniqExact(
          if(user_id = '', anonymous_id, user_id)
      )                           AS unique_users
  FROM glassbox.website_events
  GROUP BY project_id, event_date, event_name
`;
