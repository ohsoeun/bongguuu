var mysql = require("mysql");
const express = require("express");
const path = require("path");
const app = express();

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

var conn = mysql.createConnection({
  host: "localhost",
  user: "root", // user
  password: "0531", // 비밀번호
  database: "bonggu",
});

conn.connect();

app.listen(8080, function () {
  console.log("포트 8080으로 서버 대기 중...");
});

app.get("/", function (req, res) {
  // res.sendFile(__dirname + "/public/html/index.html");
  let sql = "select * from books";
  conn.query(sql, function (err, rows, fields) {
    if (err) throw err;
    console.log(rows);
    res.render("index.ejs", { data: rows });
  });
});

app.get("/signIn", function (req, res) {
  res.render("login.ejs");
});

app.get("/signUp", function (req, res) {
  res.render("signup.ejs");
});