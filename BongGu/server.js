var mysql = require("mysql");
const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const crypto = require("crypto");
const fs = require("fs");
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(cookieParser());
app.set("view engine", "ejs");

const secretKey = crypto.randomBytes(64).toString("hex");
app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: true,
  }),
);
app.use(checkLoginStatus);

var conn = mysql.createConnection({
  host: "localhost",
  user: "root", // user
  password: "1234", // 비밀번호
  database: "bonggu", // db명
});

conn.connect();

app.listen(8080, function () {
  console.log("포트 8080으로 서버 대기 중...");
});

app.get("/", function (req, res) {
  const user = res.locals.loggedInUser;
  console.log(user);

  let sql = "SELECT * FROM books";
  conn.query(sql, function (err, rows) {
    if (err) throw err;

    rows.forEach((row) => {
      const imagePath = path.join(
        __dirname,
        "public",
        "ex_photo",
        row.preview_image_uri,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      row.preview_image = base64Image;
    });

    res.render("index.ejs", { data: rows, user: user });
  });
});

app.get("/content/:id", function (req, res) {
  const bookId = req.params.id;

  let sql = "SELECT * FROM books WHERE id = ?";
  let params = [bookId];

  conn.query(sql, params, function (err, result) {
    if (err) throw err;

    if (result.length > 0) {
      const bookInfo = result[0];

      const imagePath = path.join(
        __dirname,
        "public",
        "ex_photo",
        bookInfo.detailed_image_uri,
      );
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      bookInfo.detail_image = base64Image;

      res.render("content.ejs", { book: bookInfo });
    } else {
      res.status(404).send("Book not found");
    }
  });
});

app.get("/login", function (req, res) {
  res.render("login.ejs");
});

app.get("/signup", function (req, res) {
  res.render("signup.ejs");
});

app.post("/signup_server", function (req, res) {
  console.log(req.body);
  let sql =
    "INSERT INTO `users` (`id`, `password`, `name`, `email`, `address`, `phone_number`, `type`) VALUES (?, ?, ?, ?, ?, ?, ?);";
  let params = [
    req.body.userid,
    req.body.password,
    req.body.username,
    req.body.email,
    req.body.address,
    req.body.phone,
    "user",
  ];
  conn.query(sql, params, function (err, result) {
    if (err) throw err;
    console.log("데이터 추가 성공");
  });
  res.redirect("/");
});

app.post("/signin_server", function (req, res) {
  console.log(req.body);
  const id = req.body.userid;
  const password = req.body.password;

  let sql = "SELECT * FROM users WHERE id = ? AND password = ?";
  let params = [id, password];

  conn.query(sql, params, function (err, result) {
    if (err) throw err;

    if (result.length > 0) {
      console.log("로그인 성공");
      console.log(result);
      const name = result[0].name;
      req.session.user = { id, name };
      // res.send("login success");
      res.redirect("/");
    } else {
      console.log("로그인 실패");
      res.send("login failed");
    }
  });
});

function checkLoginStatus(req, res, next) {
  const user = req.session.user;

  if (user) {
    res.locals.loggedInUser = user;
  } else {
    res.locals.loggedInUser = null;
  }

  next();
}
