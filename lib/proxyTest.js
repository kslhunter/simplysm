/*
const proxy = new Proxy(
  {
    aaa: 1,
    bbb: 2,
  },
  {
    get(target, prop) {
      if (prop === "aaa") {
        return "world";
      }
      return Reflect.get(...arguments);
    },
    set(target, p, newValue, receiver) {
      console.log(target, p, newValue, receiver);
      return true;
    },
  },
);

proxy.ccc = 0;

const handler = {
  get(target, p, receiver) {
    console.log("get", target, p);
    const result = Reflect.get(target, p, receiver);
    if (result !== null && typeof result === "object") {
      return new Proxy(Reflect.get(target, p, receiver), handler);
    } else {
      return result;
    }
  },
  set(target, p, newValue, receiver) {
    const result = Reflect.set(target, p, newValue, receiver);

    console.log("set", target, p);
    return result;
  },
  apply(target, thisArg, argArray){
    console.log("apply", target);
    return Reflect.apply(target, thisArg, argArray);
  }
};

console.log("newProxy");
const aaa = [];
const proxy2 = new Proxy(aaa, handler);

const bbb = { a: 1 };
console.log("proxy2.push(bbb)");
proxy2.push(bbb);
console.log("proxy2[0].a = 2");
proxy2[0].a = 2;


const fn = () => {
  console.log("111");
};
const proxy3 = new Proxy(fn, handler);
console.log("proxy3()");
proxy3();*/

/*
import { computed, isSignal, signal } from "@angular/core";
import {
  producerIncrementEpoch,
  producerNotifyConsumers,
  producerUpdatesAllowed,
  runPostSignalSetFn,
  SIGNAL,
} from "@angular/core/primitives/signals";

function reactive(initialValue) {
  let initVal;
  if (typeof initialValue === "object") {
    initVal = reactiveObject(initialValue, mark);
  } else {
    initVal = initialValue;
  }
  const sig = signal(initVal);

  function mark() {
    if (!producerUpdatesAllowed()) {
      throw new Error();
    }

    const node = sig[SIGNAL];
    node.version++;
    producerIncrementEpoch();
    producerNotifyConsumers(node);
    runPostSignalSetFn();
  }

  return {
    get value() {
      return sig();
    },
    set value(val) {
      if (typeof val === "object") {
        sig.set(reactiveObject(val, mark));
      } else {
        sig.set(val);
      }
    },
  };
}

function reactiveObject(obj, mark) {
  return new Proxy(obj, {
    set(target, p, newValue, receiver) {
      mark();

      if (typeof newValue === "object") {
        return Reflect.set(target, p, reactiveObject(newValue, mark), receiver);
      }

      return Reflect.set(target, p, newValue, receiver);
    },
  });
}

export function isWritableSignal(value) {
  return isSignal(value) && "set" in value && "update" in value && "asReadonly" in value;
}

const robj = reactive({
  aaa: "1",
  bbb: {
    ccc: "d",
    ddd: ["ee", "ff"],
  },
});

console.log(robj.value);

const bbb = computed(() => {
  console.log("!!!!", robj.value.ccc);
  return robj.value.ccc;
});
console.log(1, bbb());
console.log(2, bbb());

// console.log(2, robj);

robj.value.ccc = "3";

// console.log(3, robj);

console.log(3, bbb());

console.log(robj.value.ccc);
*/

/*
import { computed, signal } from "@angular/core";
import {
  producerIncrementEpoch,
  producerNotifyConsumers, producerUpdatesAllowed,
  runPostSignalSetFn,
  SIGNAL
} from "@angular/core/primitives/signals";

function reactiveObject(obj, psigs) {
  const handler = {
    set(target, p, newValue, receiver) {
      for (const psig of psigs) {
        const node = psig[SIGNAL];
        node.version++;
        producerNotifyConsumers(node);
      }

      const node = sig[SIGNAL];
      node.version++;
      producerNotifyConsumers(node);

      producerIncrementEpoch();
      runPostSignalSetFn();

      if (typeof newValue === "object") {
        return Reflect.set(target, p, reactiveObject(newValue, [...psigs, sig]), receiver);
      }

      return Reflect.set(target, p, newValue, receiver);
    },
  };

  const sig = signal(new Proxy(obj, handler));

  return {
    get value() {
      return sig();
    },
    set value(val) {
      sig.set(new Proxy(val, handler));
    },
  };
}

const robj = reactiveObject(
  {
    aaa: "1",
    bbb: {
      ccc: "d",
      ddd: ["ee", "ff"],
    },
  },
  [],
);

const bbb = computed(() => {
  console.log("!!!!", robj.value.ccc);
  return robj.value.ccc;
});
console.log(1, bbb());

robj.value.ccc = 3;

console.log(2, bbb());
*/

import { computed, signal } from "@angular/core";

function reactive(initialValue) {
  const sig = signal(typeof initialValue === "object" ? reactiveObject(initialValue) : initialValue);

  return {
    get value() {
      return sig();
    },
    set value(val) {
      return sig.set(typeof val === "object" ? reactiveObject(val) : val);
    },
  };
}

function reactiveObject(obj) {
  const signals = {};

  return new Proxy(obj, {
    get(target, p, receiver) {
      if (!signals[p]) {
        const res = Reflect.get(target, p, receiver);
        if (typeof res === "object") {
          signals[p] = signal(reactiveObject(res));
        } else {
          signals[p] = signal(res);
        }
      }

      return signals[p]();
    },
    set(target, p, newValue, receiver) {
      if (signals[p]) {
        if (typeof newValue === "object") {
          signals[p].set(reactiveObject(newValue));
        } else {
          signals[p].set(newValue);
        }
      } else {
        if (typeof newValue === "object") {
          signals[p] = signal(reactiveObject(newValue));
        } else {
          signals[p] = signal(newValue);
        }
      }

      return Reflect.set(target, p, newValue, receiver);
    },
  });
}

const robj = reactiveObject(
  {
    aaa: "1",
    bbb: {
      ccc: "d",
      ddd: ["ee", "ff"],
    },
  },
  [],
);

const bbb = computed(() => {
  return robj.ccc;
});
console.log(1, bbb());

robj.ccc = 3;

console.log(2, bbb());

const rarr = reactiveObject([
  {
    a: 1,
    b: 2,
  },
  {
    c: 3,
    d: 4,
  },
]);

const rarr_computed = computed(() => {
  return rarr[0].a;
});
console.log(1, rarr_computed());

rarr[0].a = 3;

console.log(2, rarr.length);
rarr.push("1234");
console.log(3, rarr.length);
