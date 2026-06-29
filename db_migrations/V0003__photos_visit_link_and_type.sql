ALTER TABLE photos ADD COLUMN visit_id INTEGER REFERENCES visits(id);
ALTER TABLE photos ADD COLUMN photo_type VARCHAR(20) DEFAULT 'process';
CREATE INDEX idx_photos_visit ON photos(visit_id);