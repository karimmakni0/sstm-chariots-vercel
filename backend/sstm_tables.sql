CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  payment_status VARCHAR(10) CHECK (payment_status IN ('PAID','UNPAID')) DEFAULT 'UNPAID',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chariot_usages (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  chariot_type VARCHAR(5) CHECK (chariot_type IN ('3T','5T','7T','16T')) NOT NULL,
  hours_worked NUMERIC(8,2) NOT NULL,
  price_per_hour NUMERIC(10,3) NOT NULL,
  total_price NUMERIC(12,3) NOT NULL,
  payment_status VARCHAR(10) CHECK (payment_status IN ('Paid','Unpaid')) DEFAULT 'Unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ht NUMERIC(12,3) NOT NULL,
  tva NUMERIC(12,3) NOT NULL,
  timbre NUMERIC(6,3) DEFAULT 1.000,
  ttc NUMERIC(12,3) NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  designation VARCHAR(255) NOT NULL,
  hours NUMERIC(8,2) NOT NULL,
  price_per_hour NUMERIC(10,3) NOT NULL,
  tva_rate NUMERIC(5,4) DEFAULT 0.19,
  total NUMERIC(12,3) NOT NULL
);

CREATE TABLE IF NOT EXISTS lavages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_files (
  id SERIAL PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(20) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_path TEXT NOT NULL,
  company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO users (username, password_hash, role) VALUES
  ('admin', '$2b$10$placeholder_hash_replace_me', 'admin')
ON CONFLICT (username) DO NOTHING;

INSERT INTO companies (id, name, payment_status) VALUES
  (1, 'BTP Constructions',  'PAID'),
  (2, 'Logistique Express', 'UNPAID'),
  (3, 'Mines du Nord',      'PAID'),
  (4, 'Port Services SA',   'PAID'),
  (5, 'Agro Maroc',         'UNPAID')
ON CONFLICT (id) DO NOTHING;

SELECT setval('companies_id_seq', 5);

INSERT INTO chariot_usages (company_id, chariot_type, hours_worked, price_per_hour, total_price, payment_status) VALUES
  (1, '5T',  40,  70,  2800,  'Paid'),
  (1, '3T',  24,  50,  1200,  'Unpaid'),
  (2, '3T',  60,  50,  3000,  'Paid'),
  (2, '7T',  30,  120, 3600,  'Unpaid'),
  (3, '16T', 80,  200, 16000, 'Paid'),
  (3, '7T',  45,  120, 5400,  'Unpaid'),
  (4, '16T', 120, 200, 24000, 'Paid'),
  (5, '3T',  20,  50,  1000,  'Unpaid');
