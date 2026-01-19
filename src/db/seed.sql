-- src/db/seed.sql
-- Simple seed bats (only inserts if table is empty)
INSERT INTO bats (tenant_id, brand, model, size_label, weight_g, pickup_rating, sweet_spot, profile, handle_shape, handle_length, bow, notes, image_url)
SELECT 1, 'Kookaburra', 'Kahuna 1000', 'SH', 1180, 7, 'mid', 'balanced', 'oval', 'standard', 'mid',
       'All-round profile, forgiving middle.', '/img/bats/bat-001.jpg'
WHERE NOT EXISTS (SELECT 1 FROM bats);

INSERT INTO bats (tenant_id, brand, model, size_label, weight_g, pickup_rating, sweet_spot, profile, handle_shape, handle_length, bow, notes, image_url)
SELECT 1, 'Gray-Nicolls', 'Alpha 1.1', 'SH', 1210, 6, 'high', 'toe_heavy', 'oval', 'standard', 'high',
       'Power profile, higher sweet spot.', '/img/bats/bat-002.jpg'
WHERE NOT EXISTS (SELECT 1 FROM bats WHERE brand='Gray-Nicolls' AND model='Alpha 1.1');

INSERT INTO bats (tenant_id, brand, model, size_label, weight_g, pickup_rating, sweet_spot, profile, handle_shape, handle_length, bow, notes, image_url)
SELECT 1, 'Gunn & Moore', 'Icon Pro 909', 'SH', 1160, 8, 'mid', 'balanced', 'round', 'short', 'mid',
       'Light pick-up feel, quick hands.', '/img/bats/bat-003.jpg'
WHERE NOT EXISTS (SELECT 1 FROM bats WHERE brand='Gunn & Moore' AND model='Icon Pro 909');
