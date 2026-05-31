export class AudioTransformer {
  public static readonly key: string;

  public async transform(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    return audioBuffer;
  }

  public static get title(): string {
    return "Unkown";
  }

  protected async doWorkerTask(workerFunction, input, buffers) {
    // Create worker
    const fnString =
      "(" + workerFunction.toString().replace('"use strict";', "") + ")();";
    const workerBlob = new Blob([fnString]);
    const workerBlobURL = window.URL.createObjectURL(workerBlob);
    const worker = new Worker(workerBlobURL);

    // Run worker
    return await new Promise(function (resolve, reject) {
      worker.onmessage = function (e) {
        resolve(e.data);
      };
      worker.postMessage(input, buffers);
    });
  }
}
