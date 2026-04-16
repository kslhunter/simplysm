self.onmessage = (e) => {
  self.postMessage("worker2:" + e.data);
};
