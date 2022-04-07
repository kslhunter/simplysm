interface Blob {
  download(fileName: string): void;
}

((prototype) => {
  prototype.download = function (this: Blob, fileName: string): void {
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(this);
    link.download = fileName;
    link.click();
  };
})(Blob.prototype);
