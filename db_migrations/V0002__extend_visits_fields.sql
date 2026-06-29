ALTER TABLE visits ADD COLUMN visit_at TIMESTAMP;
ALTER TABLE visits ADD COLUMN duration_minutes INTEGER;
ALTER TABLE visits ADD COLUMN materials TEXT;
ALTER TABLE visits ADD COLUMN result TEXT;
ALTER TABLE visits ADD COLUMN recommendations TEXT;
ALTER TABLE visits ADD COLUMN next_visit_date DATE;
ALTER TABLE visits ADD COLUMN price NUMERIC(10,2);

UPDATE visits SET visit_at = visit_date::timestamp WHERE visit_at IS NULL;