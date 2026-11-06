# Prithvi's Garage

Express + MySQL site with session-based login.

## Setup
1. `npm install`
2. Run `database.sql` in MySQL Workbench (creates the `garage` database and `users` table).
3. Set your MySQL password (never put it in the code):
   - Mac/Linux: `export ROOTPASS='your-mysql-password'`
   - PowerShell: `$env:ROOTPASS="your-mysql-password"`
4. `npm start`, then open http://localhost:3000

## Session login routes
- `POST /signup` creates a user (password stored as a salted PBKDF2 hash)
- `POST /login` checks the password and stores the user in `req.session.user`
- `GET /profile` reads the session and shows the username
- `GET /logout` destroys the session
