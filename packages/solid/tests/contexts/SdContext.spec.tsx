import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { onMount } from "solid-js";
import { SdProvider, useSd, useLocalStorage } from "../../src/contexts/SdContext";

describe("SdContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("SdProvider 기본 렌더링", () => {
    const { container } = render(() => (
      <SdProvider clientName="test-app">
        <div>테스트</div>
      </SdProvider>
    ));

    expect(container.textContent).toBe("테스트");
  });

  it("useSd로 clientName 접근", () => {
    let clientNameValue: string | undefined;

    render(() => (
      <SdProvider clientName="test-app">
        <TestConsumer
          onMount={(clientName) => {
            clientNameValue = clientName;
          }}
        />
      </SdProvider>
    ));

    expect(clientNameValue).toBe("test-app");
  });

  it("SdProvider 없이 useSd 호출 시 에러 발생", () => {
    expect(() => {
      render(() => <TestConsumerSd onMount={() => {}} />);
    }).toThrow("useSd는 SdProvider 내부에서만 사용할 수 있습니다.");
  });

  it("useLocalStorage - SdProvider 내부에서 프리픽스 추가", () => {
    let storageUtils: ReturnType<typeof useLocalStorage> | undefined;

    render(() => (
      <SdProvider clientName="test-app">
        <TestConsumerStorage
          onMount={(storage) => {
            storageUtils = storage;
          }}
        />
      </SdProvider>
    ));

    storageUtils?.setItem("my-key", "my-value");
    expect(localStorage.getItem("test-app:my-key")).toBe("my-value");
    expect(storageUtils?.getItem("my-key")).toBe("my-value");

    storageUtils?.removeItem("my-key");
    expect(localStorage.getItem("test-app:my-key")).toBeNull();
  });

  it("useLocalStorage - SdProvider 외부에서 에러 발생", () => {
    expect(() => {
      render(() => <TestConsumerStorage onMount={() => {}} />);
    }).toThrow("useSd는 SdProvider 내부에서만 사용할 수 있습니다.");
  });

  it("useLocalStorage - 다른 clientName으로 localStorage 격리", () => {
    let storage1: ReturnType<typeof useLocalStorage> | undefined;
    let storage2: ReturnType<typeof useLocalStorage> | undefined;

    render(() => (
      <>
        <SdProvider clientName="app1">
          <TestConsumerStorage
            onMount={(storage) => {
              storage1 = storage;
            }}
          />
        </SdProvider>
        <SdProvider clientName="app2">
          <TestConsumerStorage
            onMount={(storage) => {
              storage2 = storage;
            }}
          />
        </SdProvider>
      </>
    ));

    storage1?.setItem("shared-key", "value1");
    storage2?.setItem("shared-key", "value2");

    expect(localStorage.getItem("app1:shared-key")).toBe("value1");
    expect(localStorage.getItem("app2:shared-key")).toBe("value2");
    expect(storage1?.getItem("shared-key")).toBe("value1");
    expect(storage2?.getItem("shared-key")).toBe("value2");
  });

  it("useLocalStorage - getItem에서 존재하지 않는 키는 null 반환", () => {
    let storageUtils: ReturnType<typeof useLocalStorage> | undefined;

    render(() => (
      <SdProvider clientName="test-app">
        <TestConsumerStorage
          onMount={(storage) => {
            storageUtils = storage;
          }}
        />
      </SdProvider>
    ));

    expect(storageUtils?.getItem("non-existent")).toBeNull();
  });
});

function TestConsumer(props: { onMount: (clientName: string) => void }) {
  const sd = useSd();
  onMount(() => props.onMount(sd.clientName));
  return null;
}

function TestConsumerSd(props: { onMount: () => void }) {
  useSd(); // 이 호출에서 Provider 외부면 에러가 발생
  onMount(() => props.onMount());
  return null;
}

function TestConsumerStorage(props: { onMount: (storage: ReturnType<typeof useLocalStorage>) => void }) {
  const storage = useLocalStorage();
  onMount(() => props.onMount(storage));
  return null;
}
