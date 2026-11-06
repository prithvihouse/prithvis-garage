const express = require("express");           // web framework
const path = require("path");
const crypto = require("crypto");             // built-in module used to hash passwords
const session = require("express-session");   // npm install express-session
const mysql = require("mysql2");

const app = express();

// ---------------------------------------------------------------
// Middleware (runs on every request before our routes)
// ---------------------------------------------------------------

// Parse HTML form submissions (method="POST") into req.body
app.use(express.urlencoded({ extended: true }));

// Serve index.html, about.html, login.html, style.css, etc. from /public
app.use(express.static(path.join(__dirname, "public")));

// Session setup. express-session gives every visitor a session ID stored in a
// cookie; the data itself (req.session.user) lives on the server.
app.use(session({
    secret: process.env.SESSION_SECRET || "dev-only-secret-change-me", // signs the session ID cookie
    resave: false,              // don't re-save sessions that haven't changed
    saveUninitialized: false,   // don't create a session until we store something in it
    cookie: {
        maxAge: 60 * 60 * 1000, // cookie expires after 1 hour
        httpOnly: true,         // JavaScript in the browser can't read the cookie (helps against XSS)
        secure: false           // set to true when the site runs on HTTPS
    }
}));

// ---------------------------------------------------------------
// MySQL connection
// The MySQL password comes from the ROOTPASS environment variable so it is
// NOT stored in the code (or on GitHub). Set it before starting the server:
//   Mac/Linux:  export ROOTPASS='your-mysql-password'
//   PowerShell: $env:ROOTPASS="your-mysql-password"
// ---------------------------------------------------------------
if (!process.env.ROOTPASS) {
    console.log("WARNING: ROOTPASS is not set. Run: export ROOTPASS='your-mysql-password'");
}

const conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: process.env.ROOTPASS,
    database: "garage",
    port: 3306,
    dateStrings: true
});

conn.connect(function (err) {
    if (err) console.log("Couldn't connect to MySQL", err);
    else console.log("Database connection established");
});

// ---------------------------------------------------------------
// Password hashing helpers
// Each user gets their own random salt; PBKDF2 hashes password + salt.
// We store the salt and the hash, never the plain password.
// ---------------------------------------------------------------
const HASH_ROUNDS = 100000;
const HASH_LENGTH = 64;

function hashPassword(plainPassword, salt) {
    return crypto.pbkdf2Sync(plainPassword, salt, HASH_ROUNDS, HASH_LENGTH, "sha512").toString("hex");
}

// Escape user-provided text before putting it into HTML (prevents script injection)
function escapeHtml(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Wraps a message in the same layout/styling as the rest of the site
function page(title, bodyHtml) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prithvi's Garage | ${title}</title>
    <link rel="stylesheet" href="styles.css">
    <script src="script.js"></script>
</head>
<body>
<div class="site-layout">
    <aside class="sidebar">
        <h1>Prithvi's <span>Garage</span></h1>
        <nav>
            <a href="index.html">Home</a>
            <a href="about.html">About</a>
            <a href="rides.html">Rides &amp; Gear</a>
            <a href="/profile">Profile</a>
        </nav>
        <button id="theme-toggle" class="theme-toggle" type="button" aria-pressed="false">Switch to Dark Theme</button>
    </aside>
    <main class="main-content">
        <header class="topbar"><h2>${title.toUpperCase()}</h2></header>
        <section class="card">${bodyHtml}</section>
    </main>
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------
// POST /signup : create a new user with a hashed password
// ---------------------------------------------------------------
app.post("/signup", function (req, res) {
    const { first_name, last_name, username, email, password, bike, riding_level } = req.body;

    // Basic validation
    if (!first_name || !last_name || !username || !email || !password) {
        return res.status(400).send(page("Sign Up", '<p>Please fill in every required field. <a href="signup.html">Try again</a></p>'));
    }
    if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
        return res.status(400).send(page("Sign Up", '<p>Username must be 3-30 letters, numbers, or underscores. <a href="signup.html">Try again</a></p>'));
    }

    const salt = crypto.randomBytes(16).toString("hex"); // unique random salt for this user
    const passwordHash = hashPassword(password, salt);

    // The ? placeholders keep user input out of the SQL string (prevents SQL injection)
    const sql = `INSERT INTO users (first_name, last_name, username, email, bike, riding_level, joined_on, password_hash, salt)
                 VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)`;
    const values = [first_name, last_name, username, email, bike || null, riding_level || "Beginner", passwordHash, salt];

    conn.query(sql, values, function (err) {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).send(page("Sign Up", '<p>That username or email is already taken. <a href="signup.html">Try again</a></p>'));
            }
            console.log("Error inserting user", err);
            return res.status(500).send(page("Sign Up", "<p>Database error.</p>"));
        }
        res.send(page("Sign Up", '<p>Account created! <a href="login.html">Log in here</a></p>'));
    });
});

// ---------------------------------------------------------------
// POST /login : check the password, then store the user in the SESSION
// ---------------------------------------------------------------
app.post("/login", function (req, res) {
    const { username, password } = req.body;
    const failMessage = '<p>Incorrect username or password. <a href="login.html">Try again</a></p>';

    if (!username || !password) {
        return res.status(400).send(page("Login", failMessage));
    }

    conn.query("SELECT user_id, username, password_hash, salt FROM users WHERE username = ?", [username], function (err, rows) {
        if (err) {
            console.log("Login query error", err);
            return res.status(500).send(page("Login", "<p>Database error.</p>"));
        }

        // No such user, or a seed user that has no password set
        if (rows.length === 0 || !rows[0].password_hash) {
            return res.status(401).send(page("Login", failMessage));
        }

        const user = rows[0];
        const attempt = Buffer.from(hashPassword(password, user.salt), "hex");
        const stored = Buffer.from(user.password_hash, "hex");

        // timingSafeEqual compares without leaking timing information
        if (!crypto.timingSafeEqual(attempt, stored)) {
            return res.status(401).send(page("Login", failMessage));
        }

        // Password is correct. Create a fresh session ID (prevents session fixation),
        // then save the user's info in the session.
        req.session.regenerate(function (err) {
            if (err) return res.status(500).send(page("Login", "<p>Session error.</p>"));

            req.session.user = { user_id: user.user_id, username: user.username };

            req.session.save(function () {
                res.redirect("/profile");
            });
        });
    });
});

// ---------------------------------------------------------------
// GET /profile : reads the session and shows the username
// ---------------------------------------------------------------
app.get("/profile", function (req, res) {
    // No user in the session means they are not logged in
    if (!req.session.user) {
        return res.send(page("Profile", '<p>You are not logged in. <a href="login.html">Log in here</a></p>'));
    }

    // Pull fresh details about this user from the database using the ID in the session
    conn.query("SELECT first_name, last_name, bike, riding_level, joined_on FROM users WHERE user_id = ?",
        [req.session.user.user_id], function (err, rows) {
            if (err || rows.length === 0) {
                return res.status(500).send(page("Profile", "<p>Could not load your profile.</p>"));
            }
            const u = rows[0];
            res.send(page("Profile", `
                <h3>Hi, ${escapeHtml(req.session.user.username)}!</h3>
                <p>Name: ${escapeHtml(u.first_name)} ${escapeHtml(u.last_name)}</p>
                <p>Bike: ${escapeHtml(u.bike || "None yet")}</p>
                <p>Riding level: ${escapeHtml(u.riding_level)}</p>
                <p>Member since: ${escapeHtml(u.joined_on)}</p>
                <p><a href="/logout">Logout</a></p>
            `));
        });
});

// ---------------------------------------------------------------
// GET /logout : destroys the session
// ---------------------------------------------------------------
app.get("/logout", function (req, res) {
    req.session.destroy(function (err) {
        if (err) return res.send(page("Logout", "<p>Error logging out.</p>"));
        res.clearCookie("connect.sid"); // remove the session cookie from the browser
        res.send(page("Logout", '<p>Logged out successfully! <a href="login.html">Log in again</a></p>'));
    });
});

// Retrieve (the R in CRUD): open http://localhost:3000/users to see the table as JSON.
// Password hashes and salts are NOT selected, so they never leave the server.
app.get("/users", function (req, res) {
    conn.query("SELECT user_id, first_name, last_name, username, email, bike, riding_level, joined_on FROM users ORDER BY user_id",
        function (err, rows) {
            if (err) {
                console.log("there was an error in your query", err);
                res.status(500).send("Database error");
            } else {
                res.json(rows);
            }
        });
});

app.listen(3000, function () {
    console.log("Server running at http://localhost:3000");
});
