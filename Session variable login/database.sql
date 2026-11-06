-- ============================================================
-- Prithvi's Garage - users table
-- Run this whole file in MySQL Workbench (or: mysql -u root -p < database.sql)
-- ============================================================

CREATE DATABASE IF NOT EXISTS garage;
USE garage;

-- Safe to re-run: start from a clean table each time.
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    user_id      INT AUTO_INCREMENT,                 -- 1, 2, 3 ... assigned automatically
    first_name   VARCHAR(50)  NOT NULL,
    last_name    VARCHAR(50)  NOT NULL,
    username     VARCHAR(30)  NOT NULL UNIQUE,
    email        VARCHAR(100) NOT NULL UNIQUE,
    bike         VARCHAR(60),                        -- optional: NULL if they don't own one yet
    riding_level VARCHAR(20)  NOT NULL DEFAULT 'Beginner',
    joined_on    DATE         NOT NULL,
    password_hash CHAR(128),                         -- PBKDF2 hash (NULL for the seed users, who can't log in)
    salt          CHAR(32),                          -- random per-user salt used for the hash
    PRIMARY KEY (user_id)                            -- "primary key listed last" style from the slides
);

-- Dummy data (all names and emails are made up; example.com is a reserved test domain).
INSERT INTO users (first_name, last_name, username, email, bike, riding_level, joined_on) VALUES
    ('Maya',   'Rodriguez', 'mayar',   'maya.rodriguez@example.com', 'Kawasaki Ninja 400', 'Intermediate', '2026-01-12'),
    ('Ethan',  'Brooks',    'ebrooks', 'ethan.brooks@example.com',   'Yamaha R3',          'Beginner',     '2026-02-03'),
    ('Aisha',  'Khan',      'aishak',  'aisha.khan@example.com',     'Honda CBR500R',      'Intermediate', '2026-03-18'),
    ('Lucas',  'Nguyen',    'lucasn',  'lucas.nguyen@example.com',   'KTM RC 390',         'Advanced',     '2026-04-07'),
    ('Sofia',  'Patel',     'sofiap',  'sofia.patel@example.com',    'Suzuki GSX-250R',    'Beginner',     '2026-05-21'),
    ('Jordan', 'Miles',     'jmiles',  'jordan.miles@example.com',   NULL,                 'Beginner',     '2026-09-30');

-- Screenshot #1: this result grid is the "user table with dummy data".
SELECT * FROM users;
