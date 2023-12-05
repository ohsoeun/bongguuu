const bookMarkBtn = document.getElementById("addBookMarkBtn");
const user = "<%= user %>";

if (user) {
  bookMarkBtn.addEventListener("click", addBookMark);
} else {
  bookMarkBtn.addEventListener("click", loginAlert);
}

function addBookMark() {
  const userId = "<%= user.id %>";
  const productId = "<%= book.id %>";
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  const registrationDate = `${year}-${month}-${day}`;
  const type = "book";
  const xhr = new XMLHttpRequest();

  xhr.open("POST", "/bookmark", true);
  xhr.setRequestHeader("Content-Type", "application/json");

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        alert("책을 장바구니에 추가하였습니다.");
      } else if (xhr.status === 400) {
        alert("이미 장바구니에 있는 상품입니다.");
      }
    }
  };

  xhr.send(JSON.stringify({ userId, productId, registrationDate, type }));
}

function loginAlert() {
  alert("로그인이 필요합니다.");
  window.location.href = "/login";
}
