document.addEventListener("DOMContentLoaded", function () {
    const menuItems = document.querySelectorAll('.menu');

    menuItems.forEach(function (menuItem) {
        menuItem.addEventListener('mouseenter', function () {
            const submenu = menuItem.querySelector('.submenu');
            submenu.classList.add('visible');
        });

        menuItem.addEventListener('mouseleave', function () {
            const submenu = menuItem.querySelector('.submenu');
            submenu.classList.remove('visible');
        });
    });
});

document.addEventListener("DOMContentLoaded", function() {
    const headerLinks = document.querySelector('.header-links');
    const loginButton = document.querySelector('.header-links a[href="#로그인"]');

    loginButton.addEventListener('click', function(e) {
        e.preventDefault();
        showLoginForm();
    });

    headerLinks.addEventListener('mouseenter', function() {
        showSubmenu(headerLinks);
    });

    headerLinks.addEventListener('mouseleave', function() {
        hideSubmenu(headerLinks);
    });
});

function showSubmenu(menu) {
    menu.querySelector('.submenu').classList.add('visible');
}

function hideSubmenu(menu) {
    menu.querySelector('.submenu').classList.remove('visible');
}

document.body.addEventListener('click', function(event) {
    // 클릭된 엘리먼트가 body인 경우에만 클래스를 추가
    if (event.target.tagName.toLowerCase() === 'body') {
        document.body.classList.add('no-cursor');
    }
});

// 추가로, 다른 곳을 클릭했을 때 클래스를 제거하는 부분을 추가할 수 있습니다.
document.addEventListener('click', function(event) {
    // 클릭된 엘리먼트가 body 이외의 경우에 클래스를 제거
    if (event.target.tagName.toLowerCase() !== 'body') {
        document.body.classList.remove('no-cursor');
    }
});

function showLoginForm() {
    const loginContainer = document.createElement('div');
    loginContainer.className = 'login-container';
    loginContainer.innerHTML = `
        <h2>로그인</h2>
        <form>
            <label for="username">아이디:</label>
            <input type="text" id="username" name="username" required>

            <label for="password">비밀번호:</label>
            <input type="password" id="password" name="password" required>

            <button type="submit">로그인</button>
        </form>
    `;

    document.body.appendChild(loginContainer);

    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.textContent = '닫기';
    closeButton.addEventListener('click', function() {
        document.body.removeChild(loginContainer);
    });

    loginContainer.appendChild(closeButton);
}

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault(); // 기본 동작 방지

        // 로그인 처리 로직을 여기에 추가
        // 예를 들면, 아래와 같이 성공 시 메인 페이지로 이동

        // 가정: 로그인 성공 시
        const isLoggedIn = true;

        if (isLoggedIn) {
            // 로그인이 성공하면 메인 페이지로 이동
            window.location.href = "index.html";
        } else {
            // 로그인이 실패하면 적절한 처리를 수행
            alert("로그인 실패. 다시 시도해주세요.");
        }
    });
});

/*수량버튼*/
function changeQuantity(amount) {
    var quantityInput = document.querySelector('input[name="quantity"]');
    var currentQuantity = parseInt(quantityInput.value, 10);
    var newQuantity = currentQuantity + amount;

    if (newQuantity > 0) {
        quantityInput.value = newQuantity;
    }
}
/*구매평 작성 폼*/ 
function toggleReviewForm() {
    var reviewForm = document.getElementById("review-form");
    reviewForm.style.display = (reviewForm.style.display === "none") ? "block" : "none";
}
/*프로필 수정 */
function updateProfile() {
    var newUsername = document.getElementById('new-username').value;
    var newEmail = document.getElementById('new-email').value;

    // Add your logic here to handle the form submission and update user information
    // For now, just alert the new values
    alert("프로필이 수정되었습니다!\n새로운 사용자 이름: " + newUsername + "\n새로운 이메일: " + newEmail);

    // You can also reset the form or hide it after successful submission
    document.getElementById('edit-profile-form').reset();
    document.getElementById('profile-form-container').style.display = 'none';
}

function showEditProfileForm() {
    // Show the edit profile form when the "프로필 수정" link is clicked
    document.getElementById('profile-form-container').style.display = 'block';
    document.getElementById('password-form-container').style.display = 'none';
}

function changePassword() {
    var currentPassword = document.getElementById('current-password').value;
    var newPassword = document.getElementById('new-password').value;
    var confirmNewPassword = document.getElementById('confirm-new-password').value;

    // Add your logic here to handle the password change
    if (newPassword === confirmNewPassword) {
        // Passwords match, proceed with the change
        alert("비밀번호가 성공적으로 변경되었습니다!");
        document.getElementById('change-password-form').reset();
        document.getElementById('password-form-container').style.display = 'none';
    } else {
        // Passwords do not match, show an error message
        alert("새로운 비밀번호와 확인이 일치하지 않습니다. 다시 시도해주세요.");
    }
}

function showChangePasswordForm() {
    // Show the change password form when the "비밀번호 변경" link is clicked
    document.getElementById('profile-form-container').style.display = 'none';
    document.getElementById('password-form-container').style.display = 'block';
}