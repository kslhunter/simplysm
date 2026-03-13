import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { BusyContainer, Button, Card, FormGroup, Icon, Link, TextInput, ThemeToggle } from "@simplysm/solid";
import clsx from "clsx";
import { IconLock, IconMail } from "@tabler/icons-solidjs";

export function LoginView() {
  const navigate = useNavigate();

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    navigate("/home/main", { replace: true });
  };

  return (
    <BusyContainer
      ready={true}
      class={clsx("flex items-center justify-center", "pb-64", "bg-base-100 dark:bg-base-900")}
    >
      <div class={"max-w-sm"}>
        {/* Logo */}
        <div class={clsx("flex justify-center", "mb-4", "animate-[fade-in_0.6s_ease-out_both]")}>
          <img src="logo.png" alt="logo" class="scale-75" />
        </div>

        <Card class={clsx("rounded-2xl p-8", "animate-[fade-in_0.6s_ease-out_both] [animation-delay:0.3s]")}>
          {/* Form */}
          <form onSubmit={handleSubmit}>
            <FormGroup class={"w-full"}>
              <FormGroup.Item>
                <TextInput
                  class="w-full"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  required
                  lazyValidation
                  size="lg"
                  autocomplete="username"
                  value={email()}
                  onValueChange={setEmail}
                >
                  <TextInput.Prefix>
                    <Icon icon={IconMail} />
                  </TextInput.Prefix>
                </TextInput>
              </FormGroup.Item>
              <FormGroup.Item>
                <TextInput
                  required
                  lazyValidation
                  class="w-full"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  size="lg"
                  autocomplete="current-password"
                  value={password()}
                  onValueChange={setPassword}
                >
                  <TextInput.Prefix>
                    <Icon icon={IconLock} />
                  </TextInput.Prefix>
                </TextInput>
              </FormGroup.Item>

              <FormGroup.Item>
                <Button
                  theme="primary"
                  variant="solid"
                  class="w-full"
                  type="submit"
                  size="lg"
                >
                  로그인
                </Button>
              </FormGroup.Item>
              <FormGroup.Item class={"flex flex-row justify-center pt-4"}>
                <Link onClick={() => alert("비밀번호 재발급")} class={"text-sm text-base-500"}>
                  비밀번호 재발급
                </Link>
              </FormGroup.Item>
            </FormGroup>
          </form>
        </Card>
      </div>
      <ThemeToggle class="fixed bottom-4 right-4" />
    </BusyContainer>
  );
}
