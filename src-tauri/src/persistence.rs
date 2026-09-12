use std::fs;
use std::path::PathBuf;

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::Manager;

const DATABASE_FILE: &str = "workshop-zero.sqlite3";

const SCHEMA: &str = r#"
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workshop_identity (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    being_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    being_version TEXT NOT NULL,
    world_id TEXT NOT NULL,
    world_rules_version TEXT NOT NULL,
    cognitive_model TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workshop_runtime (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    tick INTEGER NOT NULL CHECK (tick >= 0),
    charge INTEGER NOT NULL CHECK (charge BETWEEN 0 AND 12),
    lamp_switch TEXT NOT NULL CHECK (lamp_switch IN ('off', 'on')),
    generator_visible_reading INTEGER NULL
        CHECK (generator_visible_reading BETWEEN 0 AND 12),
    generator_reading_tick INTEGER NULL
        CHECK (generator_reading_tick >= 0),
    probe_index INTEGER NOT NULL CHECK (probe_index >= 0)
);
"#;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkshopIdentity {
    pub being_id: String,
    pub created_at: String,
    pub being_version: String,
    pub world_id: String,
    pub world_rules_version: String,
    pub cognitive_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorldStateRecord {
    pub tick: i64,
    pub charge: i64,
    pub lamp_switch: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GeneratorObservationRecord {
    pub visible_reading: Option<i64>,
    pub reading_tick: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceSnapshot {
    pub world: WorldStateRecord,
    pub generator: GeneratorObservationRecord,
    pub probe_index: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersistedWorkshop {
    pub identity: WorkshopIdentity,
    pub snapshot: PersistenceSnapshot,
}

fn database_error(context: &str, error: impl std::fmt::Display) -> String {
    format!("{context}: {error}")
}

fn validate_snapshot(snapshot: &PersistenceSnapshot) -> Result<(), String> {
    if snapshot.world.tick < 0 {
        return Err("world tick must be non-negative".to_string());
    }

    if !(0..=12).contains(&snapshot.world.charge) {
        return Err("world charge must be between 0 and 12".to_string());
    }

    if snapshot.world.lamp_switch != "off"
        && snapshot.world.lamp_switch != "on"
    {
        return Err("lamp switch must be off or on".to_string());
    }

    if snapshot.probe_index < 0 {
        return Err("probe index must be non-negative".to_string());
    }

    match (
        snapshot.generator.visible_reading,
        snapshot.generator.reading_tick,
    ) {
        (None, None) => {}
        (Some(reading), Some(tick)) => {
            if !(0..=12).contains(&reading) {
                return Err(
                    "generator reading must be between 0 and 12".to_string(),
                );
            }

            if tick < 0 || tick > snapshot.world.tick {
                return Err(
                    "generator reading tick must be within world history"
                        .to_string(),
                );
            }
        }
        _ => {
            return Err(
                "generator reading and reading tick must be both present or both absent"
                    .to_string(),
            );
        }
    }

    Ok(())
}

pub(crate) fn initialize_connection(
    connection: &Connection,
) -> Result<(), String> {
    connection
        .execute_batch(SCHEMA)
        .map_err(|error| database_error("create Workshop schema", error))?;

    connection
        .execute(
            r#"
            INSERT OR IGNORE INTO workshop_identity (
                singleton,
                being_id,
                created_at,
                being_version,
                world_id,
                world_rules_version,
                cognitive_model
            )
            VALUES (
                1,
                'being-' || lower(hex(randomblob(16))),
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                '0.1.0',
                'workshop-zero',
                'workshop-zero-rules-v0',
                'not-installed'
            )
            "#,
            [],
        )
        .map_err(|error| database_error("initialize SELF identity", error))?;

    connection
        .execute(
            r#"
            INSERT OR IGNORE INTO workshop_runtime (
                singleton,
                tick,
                charge,
                lamp_switch,
                generator_visible_reading,
                generator_reading_tick,
                probe_index
            )
            VALUES (1, 0, 8, 'off', NULL, NULL, 0)
            "#,
            [],
        )
        .map_err(|error| database_error("initialize Workshop runtime", error))?;

    Ok(())
}

pub(crate) fn load_from_connection(
    connection: &Connection,
) -> Result<PersistedWorkshop, String> {
    let identity = connection
        .query_row(
            r#"
            SELECT
                being_id,
                created_at,
                being_version,
                world_id,
                world_rules_version,
                cognitive_model
            FROM workshop_identity
            WHERE singleton = 1
            "#,
            [],
            |row| {
                Ok(WorkshopIdentity {
                    being_id: row.get(0)?,
                    created_at: row.get(1)?,
                    being_version: row.get(2)?,
                    world_id: row.get(3)?,
                    world_rules_version: row.get(4)?,
                    cognitive_model: row.get(5)?,
                })
            },
        )
        .map_err(|error| database_error("load SELF identity", error))?;

    let snapshot = connection
        .query_row(
            r#"
            SELECT
                tick,
                charge,
                lamp_switch,
                generator_visible_reading,
                generator_reading_tick,
                probe_index
            FROM workshop_runtime
            WHERE singleton = 1
            "#,
            [],
            |row| {
                Ok(PersistenceSnapshot {
                    world: WorldStateRecord {
                        tick: row.get(0)?,
                        charge: row.get(1)?,
                        lamp_switch: row.get(2)?,
                    },
                    generator: GeneratorObservationRecord {
                        visible_reading: row.get(3)?,
                        reading_tick: row.get(4)?,
                    },
                    probe_index: row.get(5)?,
                })
            },
        )
        .map_err(|error| database_error("load Workshop runtime", error))?;

    validate_snapshot(&snapshot)?;

    Ok(PersistedWorkshop { identity, snapshot })
}

pub(crate) fn save_snapshot_to_connection(
    connection: &mut Connection,
    snapshot: &PersistenceSnapshot,
) -> Result<(), String> {
    validate_snapshot(snapshot)?;

    let transaction = connection
        .transaction()
        .map_err(|error| database_error("begin Workshop transaction", error))?;

    let changed = transaction
        .execute(
            r#"
            UPDATE workshop_runtime
            SET
                tick = ?1,
                charge = ?2,
                lamp_switch = ?3,
                generator_visible_reading = ?4,
                generator_reading_tick = ?5,
                probe_index = ?6
            WHERE singleton = 1
            "#,
            params![
                snapshot.world.tick,
                snapshot.world.charge,
                snapshot.world.lamp_switch,
                snapshot.generator.visible_reading,
                snapshot.generator.reading_tick,
                snapshot.probe_index,
            ],
        )
        .map_err(|error| database_error("save Workshop snapshot", error))?;

    if changed != 1 {
        return Err("Workshop runtime singleton row is missing".to_string());
    }

    transaction
        .commit()
        .map_err(|error| database_error("commit Workshop transaction", error))
}

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| database_error("resolve application data directory", error))?;

    fs::create_dir_all(&directory)
        .map_err(|error| database_error("create application data directory", error))?;

    Ok(directory.join(DATABASE_FILE))
}

fn open_app_connection(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = database_path(app)?;
    Connection::open(path)
        .map_err(|error| database_error("open Workshop database", error))
}

#[tauri::command]
pub fn load_or_initialize_workshop(
    app: tauri::AppHandle,
) -> Result<PersistedWorkshop, String> {
    let connection = open_app_connection(&app)?;
    initialize_connection(&connection)?;
    load_from_connection(&connection)
}

#[tauri::command]
pub fn save_workshop_snapshot(
    app: tauri::AppHandle,
    snapshot: PersistenceSnapshot,
) -> Result<(), String> {
    let mut connection = open_app_connection(&app)?;
    initialize_connection(&connection)?;
    save_snapshot_to_connection(&mut connection, &snapshot)
}