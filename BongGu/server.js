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
app.use(bodyParser.json());
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

    res.render("index.ejs", { data: rows, userName: user });
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

      res.render("content.ejs", {
        book: bookInfo,
        userName: res.locals.loggedInUser.name,
      });
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

app.get("/bookMarks", function (req, res) {
  const user = res.locals.loggedInUser;

  if (user) {
    let bookmarksSql = "SELECT * FROM bonggu.bookmarks WHERE user_id = ?";
    let bookmarksParams = [user.id];

    conn.query(bookmarksSql, bookmarksParams, function (err, bookmarksResults) {
      if (err) {
        console.error("Error fetching bookmarks:", err);
        res.status(500).send("Internal Server Error");
      } else {
        console.log(bookmarksResults);
        // Create an array to store details for each bookmark
        let bookmarkDetails = [];

        // Loop through each bookmark result
        bookmarksResults.forEach((bookmark) => {
          // Determine the type of bookmark (book, goods, workshop)
          let typeSql, typeParams;
          if (bookmark.type === "book") {
            typeSql = "SELECT * FROM bonggu.books WHERE id = ?";
          } else if (bookmark.type === "goods") {
            typeSql = "SELECT * FROM bonggu.goods WHERE id = ?";
          } else if (bookmark.type === "workshop") {
            typeSql = "SELECT * FROM bonggu.workshops WHERE id = ?";
          }

          // Fetch details based on type
          typeParams = [bookmark.product_id];

          conn.query(typeSql, typeParams, function (err, typeResults) {
            if (err) {
              console.error(
                `Error fetching details for type ${bookmark.type}:`,
                err,
              );
            } else {
              // Add the details to the array
              bookmarkDetails.push({
                bookmark: bookmark,
                details: typeResults[0], // Assuming there is only one result
              });

              // If all bookmarks have been processed, render the page
              if (bookmarkDetails.length === bookmarksResults.length) {
                console.log(bookmarkDetails);
                res.render("bookMarks.ejs", {
                  user: user.name,
                  data: bookmarkDetails,
                });
              }
            }
          });
        });
      }
    });
  } else {
    res.send(
      '<script>alert("로그인이 필요합니다."); window.location.href = "/login";</script>',
    );
  }
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

app.post("/bookmark", function (req, res) {
  const userId = res.locals.loggedInUser.id;
  const productId = req.body.productId;
  const registrationDate = req.body.registrationDate;
  const type = req.body.type;

  let checkExistenceSql =
    "SELECT * FROM `bonggu`.`bookmarks` WHERE `user_id` = ? AND `product_id` = ? AND `type` = ?;";

  let checkExistenceParams = [userId, productId, type];

  conn.query(checkExistenceSql, checkExistenceParams, function (err, results) {
    if (err) {
      console.error("Error checking bookmark existence:", err);
      res.status(500).send("Internal Server Error");
    } else {
      if (results.length > 0) {
        res.status(400).send("이미 장바구니에 있는 상품입니다.");
      } else {
        // If the bookmark doesn't exist, insert a new record
        let insertSql =
          "INSERT INTO `bonggu`.`bookmarks` (`user_id`, `product_id`, `registration_date`, `type`) VALUES (?, ?, ?, ?);";

        let insertParams = [userId, productId, registrationDate, type];

        conn.query(insertSql, insertParams, function (err, result) {
          if (err) {
            console.error("Error inserting bookmark:", err);
            res.status(500).send("Internal Server Error");
          } else {
            res.status(200).send("Book marked successfully");
          }
        });
      }
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
