import React from "react";

export function LoginScreen() {
  return (
    <div className="screen">
      <h1>로그인</h1>
      <div className="form">
        <label>
          아이디 <input type="text" />
        </label>
        <label>
          비밀번호 <input type="password" />
        </label>
        <button>로그인</button>
      </div>
    </div>
  );
}
