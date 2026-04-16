self.onconnect = (e) => {
  const port = e.ports[0];
  port.onmessage = (ev) => {
    port.postMessage(ev.data);
  };
};
