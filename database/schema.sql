USE blood_donation_platform;


-- 1. ADMIN
CREATE TABLE admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 2. HOSPITAL
CREATE TABLE hospital (
    hospital_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    registration_no VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    password VARCHAR(255) NOT NULL,

    verification_status ENUM(
        'Pending',
        'Verified',
        'Rejected',
        'Suspended'
    ) DEFAULT 'Pending',

    verified_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (verified_by)
        REFERENCES admin(admin_id)
        ON DELETE SET NULL
);


-- 3. BLOOD BANK
CREATE TABLE blood_bank (
    blood_bank_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    license_no VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    password VARCHAR(255) NOT NULL,

    verification_status ENUM(
        'Pending',
        'Verified',
        'Rejected',
        'Suspended'
    ) DEFAULT 'Pending',

    verified_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (verified_by)
        REFERENCES admin(admin_id)
        ON DELETE SET NULL
);


-- 4. DONOR
CREATE TABLE donor (
    donor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20),
    blood_group VARCHAR(5) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    address VARCHAR(255) NOT NULL,

    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,

    registration_source ENUM(
        'Individual',
        'Hospital',
        'Blood Bank'
    ) NOT NULL,

    supporting_document VARCHAR(255),
    document_type VARCHAR(100),

    verification_status ENUM(
        'Pending',
        'Verified',
        'Rejected'
    ) DEFAULT 'Pending',

    availability_status ENUM(
        'Available',
        'Unavailable'
    ) DEFAULT 'Available',

    last_donation_date DATE,
    total_donations INT DEFAULT 0,
    emergency_response_count INT DEFAULT 0,
    camp_participation_count INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 5. EMERGENCY REQUESTS
CREATE TABLE emergency_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,

    hospital_id INT NOT NULL,
    blood_group VARCHAR(5) NOT NULL,

    urgency ENUM(
        'Normal',
        'Urgent',
        'Critical'
    ) NOT NULL,

    request_status ENUM(
        'Open',
        'Fulfilled',
        'Cancelled'
    ) DEFAULT 'Open',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (hospital_id)
        REFERENCES hospital(hospital_id)
        ON DELETE CASCADE
);


-- 6. DONOR MATCHES
CREATE TABLE donor_matches (
    match_id INT AUTO_INCREMENT PRIMARY KEY,

    request_id INT NOT NULL,
    donor_id INT NOT NULL,

    distance_km DECIMAL(6, 2) NOT NULL,

    match_status ENUM(
        'Matched',
        'Notified',
        'Completed',
        'Rejected'
    ) DEFAULT 'Matched',

    donor_response ENUM(
        'Pending',
        'Accepted',
        'Rejected',
        'No Response'
    ) DEFAULT 'Pending',

    response_at DATETIME NULL,

    donation_status ENUM(
        'Pending',
        'Donated',
        'Not Donated'
    ) DEFAULT 'Pending',

    FOREIGN KEY (request_id)
        REFERENCES emergency_requests(request_id)
        ON DELETE CASCADE,

    FOREIGN KEY (donor_id)
        REFERENCES donor(donor_id)
        ON DELETE CASCADE,

    UNIQUE (request_id, donor_id)
);


-- 7. NOTIFICATIONS
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,

    donor_id INT NOT NULL,
    request_id INT NULL,
    blood_bank_id INT NULL,

    notification_type ENUM(
        'Emergency SOS',
        'Donation Camp'
    ) NOT NULL,

    message TEXT NOT NULL,

    event_date DATETIME NULL,
    location VARCHAR(255) NULL,

    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    response ENUM(
        'Pending',
        'Interested',
        'Not Interested',
        'Accepted',
        'Rejected',
        'No Response'
    ) DEFAULT 'Pending',

    response_at DATETIME NULL,

    FOREIGN KEY (donor_id)
        REFERENCES donor(donor_id)
        ON DELETE CASCADE,

    FOREIGN KEY (request_id)
        REFERENCES emergency_requests(request_id)
        ON DELETE SET NULL,

    FOREIGN KEY (blood_bank_id)
        REFERENCES blood_bank(blood_bank_id)
        ON DELETE SET NULL
);


-- 8. CHURN PREDICTION
CREATE TABLE churn_prediction (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY,

    donor_id INT NOT NULL,

    churn_probability DECIMAL(5, 2) NOT NULL,

    churn_status ENUM(
        'Active',
        'At Risk',
        'Inactive'
    ) NOT NULL,

    prediction_date DATE NOT NULL,

    FOREIGN KEY (donor_id)
        REFERENCES donor(donor_id)
        ON DELETE CASCADE
);