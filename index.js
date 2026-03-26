const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());

app.use(express.json());

const SECRET_KEY = "mysecretkey";

// ✅ DB
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,

  ssl: {
    rejectUnauthorized: false,
  },
});


db.connect((err) => {
  if (err) {
    console.log("❌ DB error", err);
  } else {
    console.log("✅ MySQL connected");
  }
});

// TEST
app.get("/", (req, res) => {
  res.send("Server working");
});


// 🔐 SIGNUP
app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;

  const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

  db.query(sql, [name, email, password], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Signup failed" });
    }

    res.json({ message: "Signup successful" });
  });
});


// 🔐 LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
    }

    if (result.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = result[0];

    if (user.password !== password) {
      return res.status(400).json({ message: "Wrong password" });
    }

    // ✅ TOKEN MUST HAVE id
    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({ token });
  });
});


// 🔐 VERIFY TOKEN
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) return res.status(401).send("No token");

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).send("Invalid token");

    console.log("🔍 Decoded:", decoded); // 🔥 DEBUG

    req.user = decoded;
    next();
  });
};


// ➕ ADD PAYMENT
app.post("/add-payment", verifyToken, (req, res) => {
  const { title, amount, status } = req.body;

  console.log("📥 Body:", req.body);     // 🔥 DEBUG
  console.log("👤 User:", req.user);     // 🔥 DEBUG

  const user_id = req.user.id;

  const sql = `
    INSERT INTO payments (user_id, title, amount, status)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [user_id, title, amount, status], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error adding payment");
    }

    res.send("Payment added");
  });
});


// 📊 GET PAYMENTS
app.get("/payments", verifyToken, (req, res) => {
  const user_id = req.user.id;

  const sql = "SELECT * FROM payments WHERE user_id = ?";

  db.query(sql, [user_id], (err, result) => {
    if (err) {
      console.log(err);
      return res.json([]); // ✅ ALWAYS return array
    }

    console.log("📊 Payments:", result); // 🔥 DEBUG

    res.json(result);
  });
});

app.delete("/delete-payment/:id", verifyToken, (req, res) => {
  const paymentId = req.params.id;
  const user_id = req.user.id;

  const sql = "DELETE FROM payments WHERE id = ? AND user_id = ?";

  db.query(sql, [paymentId, user_id], (err) => {
    if (err) {
      console.log(err);
      return res.send("Error deleting payment");
    }

    res.send("Payment deleted");
  });
});

app.put("/update-payment/:id", verifyToken, (req, res) => {
  const paymentId = req.params.id;
  const user_id = req.user.id;

  const { title, amount, status } = req.body;

  const sql = `
    UPDATE payments 
    SET title=?, amount=?, status=? 
    WHERE id=? AND user_id=?
  `;

  db.query(sql, [title, amount, status, paymentId, user_id], (err) => {
    if (err) {
      console.log(err);
      return res.send("Error updating payment");
    }

    res.send("Payment updated");
  });
});


app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});