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
};

const aaa = [];
const proxy2 = new Proxy(aaa, handler);

const bbb = { a: 1 };
console.log("proxy2.push(bbb)");
proxy2.push(bbb);
console.log("proxy2[0].a = 2");
proxy2[0].a = 2;
