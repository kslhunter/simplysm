import * as SparkMD5 from "spark-md5";

export class FileUtil {
  public static async getMd5Async(file: File | Blob): Promise<string> {
    return await new Promise<string>((resolve) => {
      const chunkSize = 2097152;
      const chunks = Math.ceil(file.size / chunkSize);

      const spark = new SparkMD5.ArrayBuffer();
      const fileReader = new FileReader();
      let currentChunk = 0;

      const loadNext = () => {
        const start = currentChunk * chunkSize;
        const end = start + chunkSize >= file.size ? file.size : start + chunkSize;
        fileReader.readAsArrayBuffer(file.slice(start, end));
      };

      fileReader.onload = () => {
        spark.append(fileReader.result as ArrayBuffer);
        currentChunk++;

        if (currentChunk < chunks) {
          loadNext();
        }
        else {
          resolve(spark.end());
        }
      };

      loadNext();
    });
  }
}
