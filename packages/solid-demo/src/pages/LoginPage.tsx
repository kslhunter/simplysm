import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Button, Card, FormGroup, Link, TextInput, ThemeToggle } from "@simplysm/solid";
import clsx from "clsx";
import { IconLock, IconMail } from "@tabler/icons-solidjs";

export default function LoginPage() {
  const navigate = useNavigate();

  const [id, setId] = createSignal("");
  const [pw, setPw] = createSignal("");

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    navigate("/home");
  }

  return (
    <div class={clsx("flex items-center justify-center", "pb-64", "bg-base-100 dark:bg-base-900")}>
      <div class="max-w-sm">
        {/* Logo */}
        <div class={clsx("flex justify-center", "mb-4", "animate-fade-in")}>
          <img src="logo-landscape.png" alt="SIMPLYSM" class="h-12 w-auto" />
        </div>

        <Card class={clsx("rounded-2xl p-8", "[animation-delay:0.3s]")}>
          {/* Form */}
          <form onSubmit={handleSubmit}>
            <FormGroup class="w-full">
              <FormGroup.Item>
                <TextInput
                  prefixIcon={IconMail}
                  class="w-full"
                  placeholder="아이디를 입력하세요"
                  size="lg"
                  required
                  touchMode
                  value={id()}
                  onValueChange={setId}
                />
              </FormGroup.Item>
              <FormGroup.Item>
                <TextInput
                  prefixIcon={IconLock}
                  class="w-full"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  size="lg"
                  required
                  touchMode
                  value={pw()}
                  onValueChange={setPw}
                />
              </FormGroup.Item>
              <FormGroup.Item>
                <Button theme="primary" variant="solid" class="w-full" type="submit" size="xl">
                  로그인
                </Button>
              </FormGroup.Item>
              <FormGroup.Item class="flex flex-row justify-center gap-3 pt-4">
                <Link onClick={() => alert("비밀번호 변경")} class="text-sm text-base-500">
                  비밀번호 변경
                </Link>
                <span class="text-base-300 dark:text-base-600">|</span>
                <Link onClick={() => alert("회원가입")} class="text-sm text-base-500">
                  회원가입
                </Link>
              </FormGroup.Item>
            </FormGroup>
          </form>
        </Card>
      </div>

      <ThemeToggle class="fixed bottom-4 right-4" size="sm" />
    </div>
  );
}
