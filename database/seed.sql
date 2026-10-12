USE blood_donation_platform;

-- ============================================
-- 1. ADMIN
-- ============================================

INSERT INTO admin (name, email, password)
VALUES
('System Admin', 'admin@bloodplatform.com', 'admin123');


-- ============================================
-- 2. HOSPITALS
-- ============================================

INSERT INTO hospital
(name, registration_no, phone, email, address,
 latitude, longitude, password, verification_status, verified_by)
VALUES
(
    'City Care Hospital',
    'HOSP001',
    '9876543210',
    'citycare@hospital.com',
    'MG Road, Bengaluru',
    12.97160000,
    77.59460000,
    'hospital123',
    'Verified',
    1
),
(
    'St. Mary Hospital',
    'HOSP002',
    '9876543211',
    'stmary@hospital.com',
    'Indiranagar, Bengaluru',
    12.97840000,
    77.64080000,
    'hospital123',
    'Verified',
    1
);


-- ============================================
-- 3. BLOOD BANKS
-- ============================================

INSERT INTO blood_bank
(name, license_no, phone, email, address,
 latitude, longitude, password, verification_status, verified_by)
VALUES
(
    'Bengaluru Blood Bank',
    'BB001',
    '9876543220',
    'bb1@bloodbank.com',
    'Jayanagar, Bengaluru',
    12.92500000,
    77.58380000,
    'bloodbank123',
    'Verified',
    1
),
(
    'LifeSaver Blood Bank',
    'BB002',
    '9876543221',
    'bb2@bloodbank.com',
    'Koramangala, Bengaluru',
    12.93520000,
    77.62450000,
    'bloodbank123',
    'Verified',
    1
);


-- ============================================
-- 4. DONORS
-- ============================================

INSERT INTO donor
(name, age, gender, blood_group, phone, email, address,
 latitude, longitude, registration_source,
 supporting_document, document_type,
 verification_status, availability_status,
 last_donation_date, total_donations,
 emergency_response_count, camp_participation_count)
VALUES

(
    'Rahul Kumar',
    28,
    'Male',
    'O+',
    '9000000001',
    'rahul@example.com',
    'MG Road, Bengaluru',
    12.97200000,
    77.59500000,
    'Individual',
    'rahul_blood_test.pdf',
    'Blood Test Report',
    'Verified',
    'Available',
    '2026-06-15',
    5,
    3,
    2
),

(
    'Priya Sharma',
    25,
    'Female',
    'A+',
    '9000000002',
    'priya@example.com',
    'Indiranagar, Bengaluru',
    12.97800000,
    77.64100000,
    'Individual',
    'priya_certificate.pdf',
    'Blood Bank Certificate',
    'Verified',
    'Available',
    '2026-08-10',
    4,
    2,
    3
),

(
    'Arjun Reddy',
    31,
    'Male',
    'B+',
    '9000000003',
    'arjun@example.com',
    'Koramangala, Bengaluru',
    12.93500000,
    77.62500000,
    'Blood Bank',
    'arjun_certificate.pdf',
    'Blood Bank Certificate',
    'Verified',
    'Available',
    '2026-02-20',
    7,
    5,
    1
),

(
    'Sneha Patel',
    27,
    'Female',
    'AB+',
    '9000000004',
    'sneha@example.com',
    'Jayanagar, Bengaluru',
    12.92550000,
    77.58400000,
    'Hospital',
    'sneha_certificate.pdf',
    'Hospital Certificate',
    'Verified',
    'Available',
    '2025-05-10',
    3,
    1,
    0
),

(
    'Vikram Singh',
    35,
    'Male',
    'O-',
    '9000000005',
    'vikram@example.com',
    'Whitefield, Bengaluru',
    12.96980000,
    77.75000000,
    'Individual',
    'vikram_blood_test.pdf',
    'Blood Test Report',
    'Pending',
    'Unavailable',
    '2025-03-12',
    2,
    0,
    0
);


-- ============================================
-- 5. EMERGENCY REQUEST
-- ============================================

INSERT INTO emergency_requests
(hospital_id, blood_group, urgency, request_status)
VALUES
(
    1,
    'O+',
    'Critical',
    'Open'
);


-- ============================================
-- 6. DONOR MATCHES
-- ============================================

INSERT INTO donor_matches
(request_id, donor_id, distance_km,
 match_status, donor_response, response_at, donation_status)
VALUES
(
    1,
    1,
    0.08,
    'Notified',
    'Accepted',
    '2026-10-08 10:30:00',
    'Pending'
),
(
    1,
    2,
    5.20,
    'Matched',
    'Pending',
    NULL,
    'Pending'
);


-- ============================================
-- 7. NOTIFICATIONS
-- ============================================

INSERT INTO notifications
(donor_id, request_id, blood_bank_id,
 notification_type, message, event_date, location, response)
VALUES
(
    1,
    1,
    NULL,
    'Emergency SOS',
    'Critical O+ blood required at City Care Hospital.',
    NULL,
    'MG Road, Bengaluru',
    'Accepted'
),
(
    2,
    NULL,
    1,
    'Donation Camp',
    'Blood donation camp organized by Bengaluru Blood Bank.',
    '2026-10-15 10:00:00',
    'Jayanagar, Bengaluru',
    'Interested'
);


-- ============================================
-- 8. CHURN PREDICTION
-- ============================================

INSERT INTO churn_prediction
(
    donor_id,
    days_since_last_donation,
    total_donations,
    emergency_response_count,
    camp_participation_count,
    churn_probability,
    churn_status,
    prediction_date
)
VALUES
(
    1,
    115,
    5,
    3,
    2,
    0.20,
    'Active',
    '2026-10-08'
),
(
    2,
    59,
    4,
    2,
    3,
    0.15,
    'Active',
    '2026-10-08'
),
(
    3,
    230,
    7,
    5,
    1,
    0.65,
    'At Risk',
    '2026-10-08'
),
(
    4,
    516,
    3,
    1,
    0,
    0.90,
    'Inactive',
    '2026-10-08'
);