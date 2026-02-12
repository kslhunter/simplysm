import { useNavigate } from "@solidjs/router";
import { TextInput, Button, ThemeToggle } from "@simplysm/solid";
import clsx from "clsx";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div
      class={clsx(
        "flex h-full items-center justify-center",
        "bg-gradient-to-br from-primary-50 to-primary-100",
        "dark:from-base-900 dark:to-base-800",
      )}
    >
      {/* Card */}
      <div
        class={clsx(
          "w-full max-w-sm rounded-2xl p-8",
          "bg-white shadow-lg",
          "dark:bg-base-800 dark:shadow-base-900/50",
        )}
      >
        {/* Logo */}
        <div class="mb-8 flex justify-center">
          <img src="logo-landscape.png" alt="SIMPLYSM" class="h-10 w-auto" />
        </div>

        {/* Form */}
        <div class="space-y-4">
          <div class="space-y-1">
            <label class="text-sm font-medium text-base-700 dark:text-base-300">아이디</label>
            <TextInput placeholder="아이디를 입력하세요" />
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium text-base-700 dark:text-base-300">비밀번호</label>
            <TextInput type="password" placeholder="비밀번호를 입력하세요" />
          </div>
        </div>

        {/* Login Button */}
        <div class="mt-6">
          <Button theme="primary" variant="solid" class="w-full" onClick={() => navigate("/home")}>
            로그인
          </Button>
        </div>

        {/* Links */}
        <div class={clsx("mt-4 flex items-center justify-center gap-3", "text-sm text-base-500 dark:text-base-400")}>
          <span class="cursor-pointer hover:text-primary-500" onClick={() => alert("비밀번호 변경")}>
            비밀번호 변경
          </span>
          <span class="text-base-300 dark:text-base-600">|</span>
          <span class="cursor-pointer hover:text-primary-500" onClick={() => alert("회원가입")}>
            회원가입
          </span>
        </div>
      </div>

      {/* Theme Toggle */}
      <div class="fixed bottom-4 right-4">
        <ThemeToggle size="sm" />
      </div>
    </div>
  );
}
