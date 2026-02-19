import { type Component, createSignal, For, onMount, onCleanup, Show } from "solid-js";
import {
  NotificationBell,
  useNotification,
  useServiceClient,
  useSharedData,
  Topbar,
  Table,
  BusyContainer,
  Tag,
} from "@simplysm/solid";

interface IDemoUser {
  id: number;
  name: string;
  department: string;
}

interface IDemoCompany {
  id: number;
  name: string;
  ceo: string;
}

type DemoSharedData = {
  user: IDemoUser;
  company: IDemoCompany;
};

const SharedDataDemo: Component = () => {
  const shared = useSharedData<DemoSharedData>();

  return (
    <div class="space-y-8">
      {/* busy 상태 */}
      <section>
        <h2 class="mb-4 text-xl font-bold">busy 상태</h2>
        <Tag theme={shared.busy() ? "warning" : "success"}>
          {shared.busy() ? "로딩 중..." : "로드 완료"}
        </Tag>
      </section>

      {/* User 목록 - items() */}
      <section>
        <h2 class="mb-4 text-xl font-bold">User — items()</h2>
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>이름</th>
              <th>부서</th>
            </tr>
          </thead>
          <tbody>
            <For each={shared.user.items()}>
              {(user) => (
                <tr>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.department}</td>
                </tr>
              )}
            </For>
          </tbody>
        </Table>
      </section>

      {/* Company 목록 - items() */}
      <section>
        <h2 class="mb-4 text-xl font-bold">Company — items()</h2>
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>회사명</th>
              <th>대표</th>
            </tr>
          </thead>
          <tbody>
            <For each={shared.company.items()}>
              {(company) => (
                <tr>
                  <td>{company.id}</td>
                  <td>{company.name}</td>
                  <td>{company.ceo}</td>
                </tr>
              )}
            </For>
          </tbody>
        </Table>
      </section>

      {/* get() 단일 조회 */}
      <section>
        <h2 class="mb-4 text-xl font-bold">get() — O(1) 단일 조회</h2>
        <div class="space-y-2">
          <div>
            <code class="text-sm">shared.user.get(1)</code>
            <span class="ml-2">=</span>
            <pre class="mt-1 inline-block rounded bg-base-100 px-3 py-1 text-sm dark:bg-base-800">
              {JSON.stringify(shared.user.get(1))}
            </pre>
          </div>
          <div>
            <code class="text-sm">shared.company.get(2)</code>
            <span class="ml-2">=</span>
            <pre class="mt-1 inline-block rounded bg-base-100 px-3 py-1 text-sm dark:bg-base-800">
              {JSON.stringify(shared.company.get(2))}
            </pre>
          </div>
          <div>
            <code class="text-sm">shared.user.get(999)</code>
            <span class="ml-2">=</span>
            <pre class="mt-1 inline-block rounded bg-base-100 px-3 py-1 text-sm dark:bg-base-800">
              {JSON.stringify(shared.user.get(999))}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};

const ConnectedSharedDataDemo: Component = () => {
  const serviceClient = useServiceClient();
  const notification = useNotification();
  const sharedData = useSharedData<DemoSharedData>();

  const [connected, setConnected] = createSignal(false);

  onMount(async () => {
    try {
      await serviceClient.connect("main", { port: 40081 });

      sharedData.configure(() => ({
        user: {
          serviceKey: "main",
          fetch: async (changeKeys) => {
            const client = serviceClient.get("main");
            return (await client.send("SharedDataDemoService", "getUsers", [
              changeKeys,
            ])) as IDemoUser[];
          },
          getKey: (item) => item.id,
          orderBy: [[(item) => item.name, "asc"]],
        },
        company: {
          serviceKey: "main",
          fetch: async (changeKeys) => {
            const client = serviceClient.get("main");
            return (await client.send("SharedDataDemoService", "getCompanies", [
              changeKeys,
            ])) as IDemoCompany[];
          },
          getKey: (item) => item.id,
          orderBy: [[(item) => item.name, "asc"]],
        },
      }));

      setConnected(true);
    } catch (err) {
      notification.danger("연결 실패", String(err));
    }
  });

  onCleanup(async () => {
    if (serviceClient.isConnected("main")) {
      await serviceClient.close("main");
    }
  });

  return (
    <Show
      when={connected()}
      fallback={
        <BusyContainer busy={true}>
          <div class="h-32" />
        </BusyContainer>
      }
    >
      <SharedDataDemo />
    </Show>
  );
};

export default function SharedDataPage() {
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 flex-1 text-base">SharedData</h1>
        <NotificationBell />
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <ConnectedSharedDataDemo />
      </div>
    </Topbar.Container>
  );
}
