ALTER TABLE technical_telemetry_events ADD COLUMN event_sequence INTEGER;
CREATE UNIQUE INDEX technical_session_sequence ON technical_telemetry_events(session_id, event_sequence);
