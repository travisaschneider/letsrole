/// <reference path="../module.d.ts" />

class ImageUpload {
  protected dom: HTMLInputElement;
  protected input: HTMLInputElement;
  protected preview: HTMLImageElement;
  protected hidden: HTMLInputElement;
  protected options: any = {
    public: false,
    width: "100%",
    height: "200px",
  };

  public constructor(dom: HTMLInputElement, options: any) {
    this.dom = dom;
    this.options = { ...this.options, ...options };
    this.run();
  }

  protected run() {
    this.dom.setAttribute("type", "hidden");

    this.input = this.dom.querySelector('input[type="file"]');
    this.preview = this.dom.querySelector(".image-preview");

    this.preview.style.width = this.options.width;
    this.preview.style.height = this.options.height;
    this.preview.style.backgroundSize = "cover";
    this.preview.style.backgroundPosition = "50% 50%";

    this.hidden = this.dom.querySelector(".image-id");

    this.input.onchange = () => {
      const file = this.input.files[0];

      if (/^image\//.test(file.type)) {
        this.upload(file);
      } else {
        // display error
      }
    };
  }

  protected upload(file: File) {
    const fd = new FormData();
    fd.append("media[]", file);

    if (this.options.public) {
      fd.append("public", "1");
    }

    const url = window["configuration"]["cdnUrl"] + "/upload";

    $.ajax({
      url: url,
      type: "POST",
      data: fd,
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
          const progress: HTMLElement = this.dom.querySelector(".progress");
          const inside: HTMLElement = progress.querySelector(".progress-bar");

          progress.classList.remove("d-none");

          myXhr.upload.addEventListener(
            "progress",
            function (e) {
              if (e.lengthComputable) {
                const percent: number = (e.loaded / e.total) * 100;
                $(inside).css("width", percent.toString() + "%");
              }
            },
            false
          );
        }

        return myXhr;
      },
    }).done((data) => {
      const response = JSON.parse(data);
      const media = response[0];

      this.dom.querySelector(".progress").classList.add("d-none");
      this.hidden.value = media.id;

      this.preview.classList.remove("d-none");
      this.preview.style.backgroundImage =
        "url(" + window["configuration"]["cdnReadUrl"] + "/" + media.path + ")";
    });
  }

  public static create(dom: HTMLInputElement, options: any) {
    return new ImageUpload(dom, options);
  }

  public static init() {
    window["image-upload"] = ImageUpload;
  }
}

ImageUpload.init();
