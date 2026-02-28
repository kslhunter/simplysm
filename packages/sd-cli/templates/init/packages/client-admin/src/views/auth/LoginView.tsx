import { createSignal, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { useNavigate } from "@solidjs/router";
import {
  BusyContainer,
  Button,
  Card,
  FormGroup,
  Icon,
  TextInput,
  ThemeToggle,
  useLocalStorage,
  useNotification,
} from "@simplysm/solid";
import { useAuth } from "../../providers/AuthProvider";
import clsx from "clsx";
import { IconLock, IconMail } from "@tabler/icons-solidjs";

type Data = {
  email?: string;
  password?: string;
};

export function LoginView() {
  const auth = useAuth();
  const navigate = useNavigate();
  const noti = useNotification();

  const [busyCount, setBusyCount] = createSignal(0);
  const [ready, setReady] = createSignal(false);

  const [lastEmail, setLastEmail] = useLocalStorage<string | undefined>("last-login-email");
  const [data, setData] = createStore<Data>({ email: lastEmail() });

  onMount(async () => {
    const ok = await auth.tryReloadAuth();
    if (ok) {
      navigate("/home/main", { replace: true });
      return;
    }
    setReady(true);
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (busyCount() > 0) return;

    const currEmail = data.email!;
    const currPassword = data.password!;

    setBusyCount((c) => c + 1);
    try {
      await auth.login(currEmail, currPassword);
      setLastEmail(currEmail);
      navigate("/home/main", { replace: true });
    } catch (err) {
      noti.error(err, "로그인 오류");
    }
    setBusyCount((c) => c - 1);
  };

  return (
    <BusyContainer
      ready={ready()}
      busy={busyCount() > 0}
      class={clsx("flex items-center justify-center", "pb-64", "bg-base-100 dark:bg-base-900")}
    >
      <div class={"max-w-sm"}>
        {/* Logo */}
        <div class={clsx("flex justify-center", "mb-4", "animate-fade-in")}>
          <img src="assets/logo.png" alt="logo" class="scale-75" />
        </div>

        <Card class={clsx("rounded-2xl p-8", "animate-fade-in [animation-delay:0.3s]")}>
          {/* Form */}
          <form onSubmit={handleSubmit}>
            <FormGroup class={"w-full"}>
              <FormGroup.Item>
                <TextInput
                  class="w-full"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  required
                  touchMode
                  size="lg"
                  autocomplete="employeename"
                  value={data.email}
                  onValueChange={(v) => setData("email", v)}
                >
                  <TextInput.Prefix>
                    <Icon icon={IconMail} />
                  </TextInput.Prefix>
                </TextInput>
              </FormGroup.Item>
              <FormGroup.Item>
                <TextInput
                  required
                  touchMode
                  class="w-full"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  size="lg"
                  autocomplete="current-password"
                  value={data.password}
                  onValueChange={(v) => setData("password", v)}
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
                  size="xl"
                  disabled={busyCount() > 0}
                >
                  로그인
                </Button>
              </FormGroup.Item>
            </FormGroup>
          </form>
        </Card>
      </div>
      <ThemeToggle class="fixed bottom-4 right-4" />
    </BusyContainer>
  );
}
