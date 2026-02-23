import { type Component, createSignal, onMount, onCleanup, Show } from "solid-js";
import {
  useNotification,
  useServiceClient,
  Button,
  TextInput,
  Textarea,
  Tag,
} from "@simplysm/solid";

const ServiceClientDemo: Component = () => {
  const serviceClient = useServiceClient();
  const notification = useNotification();

  const [connected, setConnected] = createSignal(false);
  const [echoInput, setEchoInput] = createSignal("Hello, World!");
  const [echoResult, setEchoResult] = createSignal<string | null>(null);
  const [echoError, setEchoError] = createSignal<string | null>(null);

  const [jsonInput, setJsonInput] = createSignal('{ "name": "홍길동", "age": 30 }');
  const [jsonResult, setJsonResult] = createSignal<string | null>(null);
  const [jsonError, setJsonError] = createSignal<string | null>(null);

  const [pingResult, setPingResult] = createSignal<string | null>(null);
  const [healthResult, setHealthResult] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      await serviceClient.connect(undefined, { port: 40081 });
      setConnected(true);
      notification.success("연결 성공", "서버에 연결되었습니다.");
    } catch (err) {
      notification.danger("연결 실패", String(err));
    }
  });

  onCleanup(async () => {
    if (serviceClient.isConnected()) {
      await serviceClient.close();
    }
  });

  const handleEcho = async () => {
    setEchoResult(null);
    setEchoError(null);
    try {
      const client = serviceClient.get();
      const result = await client.send("EchoService", "echo", [echoInput()]);
      setEchoResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setEchoError(String(err));
    }
  };

  const handleEchoJson = async () => {
    setJsonResult(null);
    setJsonError(null);
    try {
      const data = JSON.parse(jsonInput());
      const client = serviceClient.get();
      const result = await client.send("EchoService", "echoJson", [data]);
      setJsonResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setJsonError(String(err));
    }
  };

  const handlePing = async () => {
    setPingResult(null);
    try {
      const client = serviceClient.get();
      const result = await client.send("HealthService", "ping", []);
      setPingResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setPingResult(`Error: ${String(err)}`);
    }
  };

  const handleHealthCheck = async () => {
    setHealthResult(null);
    try {
      const client = serviceClient.get();
      const result = await client.send("HealthService", "check", []);
      setHealthResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setHealthResult(`Error: ${String(err)}`);
    }
  };

  return (
    <div class="space-y-8">
      {/* 연결 상태 */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">연결 상태</h2>
        <Tag theme={connected() ? "success" : "danger"}>
          {connected() ? "연결됨 (port: 40081)" : "연결 안됨"}
        </Tag>
      </section>

      {/* EchoService */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">EchoService</h2>

        {/* echo */}
        <div class="mb-6">
          <h3 class="mb-2 font-medium">echo(message)</h3>
          <div class="flex gap-2">
            <TextInput value={echoInput()} onValueChange={setEchoInput} class="flex-1" />
            <Button theme="primary" variant="solid" onClick={handleEcho} disabled={!connected()}>
              Echo
            </Button>
          </div>
          <Show when={echoResult()}>
            <pre class="mt-2 rounded bg-base-100 p-3 text-sm dark:bg-base-800">{echoResult()}</pre>
          </Show>
          <Show when={echoError()}>
            <pre class="mt-2 rounded bg-red-100 p-3 text-sm text-red-600 dark:bg-red-900/30">
              {echoError()}
            </pre>
          </Show>
        </div>

        {/* echoJson */}
        <div>
          <h3 class="mb-2 font-medium">echoJson(data)</h3>
          <div class="flex gap-2">
            <Textarea
              value={jsonInput()}
              onValueChange={(v) => setJsonInput(v)}
              minRows={3}
              class="flex-1 font-mono text-sm"
            />
            <Button
              theme="primary"
              variant="solid"
              onClick={handleEchoJson}
              disabled={!connected()}
            >
              Echo JSON
            </Button>
          </div>
          <Show when={jsonResult()}>
            <pre class="mt-2 rounded bg-base-100 p-3 text-sm dark:bg-base-800">{jsonResult()}</pre>
          </Show>
          <Show when={jsonError()}>
            <pre class="mt-2 rounded bg-red-100 p-3 text-sm text-red-600 dark:bg-red-900/30">
              {jsonError()}
            </pre>
          </Show>
        </div>
      </section>

      {/* HealthService */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">HealthService</h2>

        <div class="flex flex-wrap gap-4">
          {/* ping */}
          <div class="flex-1">
            <h3 class="mb-2 font-medium">ping()</h3>
            <Button theme="base" variant="outline" onClick={handlePing} disabled={!connected()}>
              Ping
            </Button>
            <Show when={pingResult()}>
              <pre class="mt-2 rounded bg-base-100 p-3 text-sm dark:bg-base-800">
                {pingResult()}
              </pre>
            </Show>
          </div>

          {/* check */}
          <div class="flex-1">
            <h3 class="mb-2 font-medium">check()</h3>
            <Button
              theme="base"
              variant="outline"
              onClick={handleHealthCheck}
              disabled={!connected()}
            >
              Health Check
            </Button>
            <Show when={healthResult()}>
              <pre class="mt-2 rounded bg-base-100 p-3 text-sm dark:bg-base-800">
                {healthResult()}
              </pre>
            </Show>
          </div>
        </div>
      </section>
    </div>
  );
};

export default function ServiceClientPage() {
  return (
    <div class="space-y-8 p-6">
      <ServiceClientDemo />
    </div>
  );
}
