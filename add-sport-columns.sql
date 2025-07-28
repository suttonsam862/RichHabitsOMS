
-- Add sport and organization_type columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS sport TEXT,
ADD COLUMN IF NOT EXISTS organization_type TEXT DEFAULT 'business';

-- Update existing customers with sample sport data based on company names
UPDATE customers SET 
  sport = CASE 
    WHEN LOWER(company) LIKE '%football%' OR LOWER(company) LIKE '%fc%' THEN 'Football'
    WHEN LOWER(company) LIKE '%basketball%' THEN 'Basketball'
    WHEN LOWER(company) LIKE '%baseball%' THEN 'Baseball'
    WHEN LOWER(company) LIKE '%soccer%' THEN 'Soccer'
    WHEN LOWER(company) LIKE '%hockey%' THEN 'Hockey'
    WHEN LOWER(company) LIKE '%tennis%' THEN 'Tennis'
    WHEN LOWER(company) LIKE '%golf%' THEN 'Golf'
    WHEN LOWER(company) LIKE '%swim%' THEN 'Swimming'
    WHEN LOWER(company) LIKE '%track%' OR LOWER(company) LIKE '%running%' THEN 'Track & Field'
    WHEN LOWER(company) LIKE '%volleyball%' THEN 'Volleyball'
    WHEN LOWER(company) LIKE '%wrestling%' THEN 'Wrestling'
    WHEN LOWER(company) LIKE '%sport%' OR LOWER(company) LIKE '%athletic%' OR LOWER(company) LIKE '%team%' THEN 'General Sports'
    ELSE NULL
  END,
  organization_type = CASE
    WHEN LOWER(company) LIKE '%sport%' OR LOWER(company) LIKE '%athletic%' OR LOWER(company) LIKE '%team%' OR LOWER(company) LIKE '%fc%' OR LOWER(company) LIKE '%united%' THEN 'sports'
    WHEN LOWER(company) LIKE '%school%' OR LOWER(company) LIKE '%university%' OR LOWER(company) LIKE '%college%' THEN 'education'
    WHEN LOWER(company) LIKE '%nonprofit%' OR LOWER(company) LIKE '%foundation%' THEN 'nonprofit'
    WHEN LOWER(company) LIKE '%city%' OR LOWER(company) LIKE '%county%' OR LOWER(company) LIKE '%government%' THEN 'government'
    ELSE 'business'
  END;

-- Insert some additional sample sports customers
INSERT INTO customers (first_name, last_name, email, company, sport, organization_type, phone, created_at) VALUES
('Mike', 'Thompson', 'mthompson@citybasketball.com', 'City Basketball Club', 'Basketball', 'sports', '555-0201', NOW()),
('Sarah', 'Davis', 'sdavis@soccerfc.org', 'Metro Soccer FC', 'Soccer', 'sports', '555-0202', NOW()),
('Tom', 'Wilson', 'twilson@footballteam.net', 'Riverside Football Team', 'Football', 'sports', '555-0203', NOW()),
('Lisa', 'Anderson', 'landerson@tennisclub.com', 'Elite Tennis Club', 'Tennis', 'sports', '555-0204', NOW()),
('Ryan', 'Martinez', 'rmartinez@hockeyclub.org', 'Ice Hockey Warriors', 'Hockey', 'sports', '555-0205', NOW()),
('Emily', 'Garcia', 'egarcia@swimteam.net', 'Aquatic Swim Team', 'Swimming', 'sports', '555-0206', NOW()),
('Chris', 'Lee', 'clee@volleyballclub.com', 'Spike Volleyball Club', 'Volleyball', 'sports', '555-0207', NOW()),
('Jessica', 'Brown', 'jbrown@wrestlingteam.org', 'Ironclad Wrestling', 'Wrestling', 'sports', '555-0208', NOW()),
('Kevin', 'Johnson', 'kjohnson@trackfield.net', 'Lightning Track & Field', 'Track & Field', 'sports', '555-0209', NOW()),
('Ashley', 'Taylor', 'ataylor@golfclub.com', 'Precision Golf Club', 'Golf', 'sports', '555-0210', NOW())
ON CONFLICT (email) DO NOTHING;
