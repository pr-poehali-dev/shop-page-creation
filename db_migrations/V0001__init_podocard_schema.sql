CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'master',
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    master_id INTEGER NOT NULL REFERENCES users(id),
    client_user_id INTEGER REFERENCES users(id),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    birth_date DATE,
    diabetes BOOLEAN DEFAULT FALSE,
    varicose BOOLEAN DEFAULT FALSE,
    fungus BOOLEAN DEFAULT FALSE,
    ingrown_nail BOOLEAN DEFAULT FALSE,
    circulation BOOLEAN DEFAULT FALSE,
    oncology BOOLEAN DEFAULT FALSE,
    skin_type TEXT,
    allergies TEXT,
    contraindications TEXT,
    notes TEXT,
    next_visit_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE visits (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    visit_date DATE NOT NULL,
    procedure TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_clients_master ON clients(master_id);
CREATE INDEX idx_clients_user ON clients(client_user_id);
CREATE INDEX idx_visits_client ON visits(client_id);
CREATE INDEX idx_photos_client ON photos(client_id);