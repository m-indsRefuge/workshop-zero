use rusqlite::Connection;

use crate::persistence::{
    initialize_connection,
    load_from_connection,
    save_snapshot_to_connection,
    GeneratorObservationRecord,
    PersistenceSnapshot,
    WorldStateRecord,
};

#[test]
fn initialization_creates_one_stable_self_identity() {
    let connection = Connection::open_in_memory().expect("open in-memory sqlite");

    initialize_connection(&connection).expect("first initialize");
    let first = load_from_connection(&connection).expect("first load");

    initialize_connection(&connection).expect("second initialize");
    let second = load_from_connection(&connection).expect("second load");

    assert_eq!(first.identity.being_id, second.identity.being_id);
    assert_eq!(first.identity.created_at, second.identity.created_at);
    assert_eq!(first.identity.being_version, "0.1.0");
    assert_eq!(first.identity.world_id, "workshop-zero");
    assert_eq!(
        first.identity.world_rules_version,
        "workshop-zero-rules-v0"
    );
    assert_eq!(first.identity.cognitive_model, "not-installed");

    assert_eq!(first.snapshot.world.tick, 0);
    assert_eq!(first.snapshot.world.charge, 8);
    assert_eq!(first.snapshot.world.lamp_switch, "off");
    assert_eq!(first.snapshot.generator.visible_reading, None);
    assert_eq!(first.snapshot.generator.reading_tick, None);
    assert_eq!(first.snapshot.probe_index, 0);
}

#[test]
fn snapshot_round_trip_preserves_world_observation_and_probe_cursor() {
    let mut connection =
        Connection::open_in_memory().expect("open in-memory sqlite");

    initialize_connection(&connection).expect("initialize");

    let before = load_from_connection(&connection).expect("load before");

    let snapshot = PersistenceSnapshot {
        world: WorldStateRecord {
            tick: 3,
            charge: 5,
            lamp_switch: "on".to_string(),
        },
        generator: GeneratorObservationRecord {
            visible_reading: Some(5),
            reading_tick: Some(3),
        },
        probe_index: 3,
    };

    save_snapshot_to_connection(&mut connection, &snapshot)
        .expect("save snapshot");

    let after = load_from_connection(&connection).expect("load after");

    assert_eq!(after.snapshot, snapshot);
    assert_eq!(after.identity.being_id, before.identity.being_id);
    assert_eq!(after.identity.created_at, before.identity.created_at);
}

#[test]
fn invalid_snapshot_is_rejected_without_replacing_durable_state() {
    let mut connection =
        Connection::open_in_memory().expect("open in-memory sqlite");

    initialize_connection(&connection).expect("initialize");
    let before = load_from_connection(&connection).expect("load before");

    let invalid = PersistenceSnapshot {
        world: WorldStateRecord {
            tick: 1,
            charge: 99,
            lamp_switch: "off".to_string(),
        },
        generator: GeneratorObservationRecord {
            visible_reading: None,
            reading_tick: None,
        },
        probe_index: 1,
    };

    assert!(save_snapshot_to_connection(&mut connection, &invalid).is_err());

    let after = load_from_connection(&connection).expect("load after");
    assert_eq!(after, before);
}