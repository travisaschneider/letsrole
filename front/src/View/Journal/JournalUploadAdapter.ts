export class JournalUploadAdapter {
  protected loader: any;

  constructor(loader: any) {
    this.loader = loader;
  }

  public upload() {
    return this.loader.file.then(
      (file) =>
        new Promise((resolve, reject) => {
          this.sendRequest(file, resolve, reject);
        })
    );
  }

  public abort() {
    return;
  }

  public sendRequest(file: any, resolve: Function, reject: Function) {
    const data = new FormData();
    data.append("media[]", file);

    const url = window["configuration"]["cdnUrl"] + "/upload";

    $.ajax({
      url: url,
      type: "POST",
      data: data,
      cache: false,
      contentType: false,
      processData: false,
      xhrFields: {
        withCredentials: true,
      },
      crossDomain: true,
      xhr: () => {
        const myXhr = $.ajaxSettings.xhr();

        if (myXhr.upload) {
          myXhr.upload.addEventListener(
            "progress",
            (e) => {
              if (e.lengthComputable) {
                this.loader.uploadTotal = e.total;
                this.loader.uploaded = e.loaded;
              }
            },
            false
          );
        }

        return myXhr;
      },
    })
      .done((data) => {
        const response = JSON.parse(data);
        const media = response[0];

        const mediaUrl: string =
          window["configuration"]["cdnReadUrl"] + "/" + media.path;

        return resolve({
          default: mediaUrl,
        });
      })
      .fail((xhr: any, status: string) => {
        return reject(status);
      });
  }
}
