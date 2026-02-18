import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { TextInput, Button, ThemeToggle, FormGroup, Invalid } from "@simplysm/solid";
import clsx from "clsx";

export default function LoginPage() {
  const navigate = useNavigate();

  const [id, setId] = createSignal("");
  const [pw, setPw] = createSignal("");

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    navigate("/home");
  }

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
        <div class="mb-10 flex justify-center">
          <img src="logo-landscape.png" alt="SIMPLYSM" class="h-12 w-auto" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <FormGroup class="w-full">
            <FormGroup.Item label="아이디">
              <Invalid message={id().trim() === "" ? "아이디를 입력하세요" : ""}>
                <TextInput
                  class="w-full"
                  placeholder="아이디를 입력하세요"
                  size="lg"
                  value={id()}
                  onValueChange={setId}
                />
              </Invalid>
            </FormGroup.Item>
            <FormGroup.Item label="비밀번호">
              <Invalid message={pw().trim() === "" ? "비밀번호를 입력하세요" : ""}>
                <TextInput
                  class="w-full"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  size="lg"
                  value={pw()}
                  onValueChange={setPw}
                />
              </Invalid>
            </FormGroup.Item>
          </FormGroup>

          {/* Login Button */}
          <div class="mt-5">
            <Button theme="primary" variant="solid" class="w-full" type="submit" size="xl">
              로그인
            </Button>
          </div>
        </form>

        {/* Links */}
        <div
          class={clsx(
            "mt-4 flex items-center justify-center gap-3",
            "text-sm text-base-500 dark:text-base-400",
          )}
        >
          <span
            class="cursor-pointer hover:text-primary-500"
            onClick={() => alert("비밀번호 변경")}
          >
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
