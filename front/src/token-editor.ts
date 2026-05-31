import "./jquery";
import $ from "jquery";
import Konva from "konva";

export class TokenEditor {
  public static readonly Width: number = 800;
  public static readonly Height: number = 450;
  public static readonly AvatarWidth: number = 190;
  public static readonly AvatarHeight: number = 250;
  public static readonly TokenSize: number = 200;

  protected isEdited = false;
  protected isApp = false;
  protected isSaving = false;

  protected stage: Konva.Stage;
  protected layer: Konva.Layer;

  protected avatarGroup: Konva.Group;
  protected avatar: Konva.Image;
  protected avatarTransformer: Konva.Transformer;
  protected avatarRect: Konva.Rect;

  protected tokenGroup: Konva.Group;
  protected token: Konva.Image;
  protected tokenTransformer: Konva.Transformer;

  protected previewTimeout;
  protected previewAvatarImg: HTMLImageElement;
  protected previewTokenImg: HTMLImageElement;
  protected previewFrameAvatarImg: HTMLImageElement;
  protected previewFrameTokenImg: HTMLImageElement;

  protected linked = true;

  protected tableId: string = null;
  protected avatarFrame: string = null;
  protected avatarFrameId: number = null;
  protected tokenFrame: string = null;
  protected tokenFrameId: number = null;

  protected currentAvatarUrl: string;
  protected currentTokenUrl: string;

  protected init() {
    this.stage = new Konva.Stage({
      container: "token-editor",
      width: TokenEditor.Width,
      height: TokenEditor.Height,
    });

    this.layer = new Konva.Layer();

    const separator1 = new Konva.Line({
      x: TokenEditor.Width / 2 - 45,
      y: TokenEditor.Height / 2,
      points: [0, 0, 20, 0],
      stroke: "#d6ddd5",
      width: 1,
      listening: false,
    });

    const separator2 = new Konva.Line({
      x: TokenEditor.Width / 2 + 45,
      y: TokenEditor.Height / 2,
      points: [0, 0, -20, 0],
      stroke: "#d6ddd5",
      width: 1,
      listening: false,
    });

    this.avatarGroup = new Konva.Group({
      clipX: 0,
      clipY: 0,
      clipWidth: TokenEditor.Width / 2,
      clipHeight: TokenEditor.Height,
    });

    this.tokenGroup = new Konva.Group({
      x: TokenEditor.Width / 2,
      y: 0,
      clipX: 0,
      clipY: 0,
      clipWidth: TokenEditor.Width / 2,
      clipHeight: TokenEditor.Height,
    });

    this.layer.add(this.avatarGroup);
    this.layer.add(this.tokenGroup);
    this.layer.add(separator1);
    this.layer.add(separator2);
    this.stage.add(this.layer);

    this.initNav();
    this.initAvatar();
    this.initToken();
    this.initUploads();
    this.initSave();
    this.initLock();
    this.initQuickbar();

    this.isEdited = false;

    this.stage.batchDraw();
  }

  protected initNav() {
    const nav: HTMLElement = document.getElementById("avatar-nav");

    nav.querySelectorAll(".tab-btn").forEach((navLink: HTMLElement) => {
      navLink.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        const target: string = navLink.dataset.target;
        this.openTarget(target);
      });
    });
  }

  protected openTarget(target: string) {
    this.removeTabs();
    const container: HTMLElement = document.getElementById("target-container");

    document
      .querySelector(".navigation")
      .querySelectorAll(".tab-btn")
      .forEach((tabBtn: HTMLElement) => {
        tabBtn.parentElement.classList.remove("active");
      });

    const activeBtn: HTMLElement = document.querySelector(
      '.navigation a.tab-btn[data-target="' + target + '"]'
    );

    if (activeBtn) {
      activeBtn.parentElement.classList.add("active");
    }

    switch (target) {
      case "list-avatar":
        this.loadList("avatar");
        break;
      case "list-token":
        this.loadList("token");
        break;
      case "frame-avatar":
        this.loadFrameList("avatar");
        break;
      case "frame-token":
        this.loadFrameList("token");
        break;
      case "editor":
      default:
        container.querySelector("#content-editor").classList.remove("d-none");
        break;
    }
  }

  protected loadFrameList(type = "avatar") {
    const list: HTMLElement = document.createElement("div");
    let page = 1;

    list.id = "content-frame-" + type;

    const nav: HTMLElement = document.getElementById("avatar-nav");
    const container: HTMLElement = document.getElementById("target-container");

    const navLink: HTMLAnchorElement = nav.querySelector(
      '.tab-btn[data-target="frame-' + type + '"]'
    );
    const url: string = navLink.dataset.url;

    const reload = () => {
      $.get(
        url,
        {
          page: page,
          avatar: type === "avatar",
          token: type === "token",
          table_id: this.tableId,
        },
        (response: string) => {
          list.innerHTML = response;

          list
            .querySelectorAll(".page-link")
            .forEach((pageLink: HTMLElement) => {
              pageLink.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();
                page = parseInt(pageLink.dataset.page, 10);

                reload();
              });
            });

          list
            .querySelector("#remove-frame-btn")
            .addEventListener("click", (e: MouseEvent) => {
              e.preventDefault();

              if (type === "avatar") {
                this.avatarFrame = null;
                this.avatarFrameId = null;
              } else {
                this.tokenFrame = null;
                this.tokenFrameId = null;
              }

              this.updatePreview();
            });

          list
            .querySelectorAll("img[data-path]")
            .forEach((img: HTMLImageElement) => {
              img.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();

                const type: string = img.dataset.type;
                const path: string = img.dataset.path;
                const id: number = parseInt(img.dataset.id);

                if (type === "avatar") {
                  this.avatarFrame = path;
                  this.avatarFrameId = id;
                } else {
                  this.tokenFrame = path;
                  this.tokenFrameId = id;
                }

                this.updatePreview();
                selectCurrent();
              });
            });

          list
            .querySelector(".back-btn")
            .addEventListener("click", (e: MouseEvent) => {
              this.openTarget("editor");
            });

          const selectCurrent = () => {
            list
              .querySelectorAll(".frame-picker")
              .forEach((framePicker: HTMLElement) => {
                framePicker.classList.remove("active");
              });

            let activePath: string = null;

            if (type === "avatar") {
              if (this.avatarFrame) {
                activePath = this.avatarFrame;
              }
            } else {
              if (this.tokenFrame) {
                activePath = this.tokenFrame;
              }
            }

            if (activePath) {
              const avatar = list.querySelector(
                'img[data-path="' + activePath + '"]'
              );

              if (avatar) {
                avatar.parentElement.classList.add("active");
              }
            }
          };

          selectCurrent();
        }
      );
    };

    container.append(list);
    reload();
  }

  protected loadList(type = "avatar") {
    const list: HTMLElement = document.createElement("div");
    let page = 1;

    list.id = "content-list-" + type;

    const nav: HTMLElement = document.getElementById("avatar-nav");
    const container: HTMLElement = document.getElementById("target-container");

    const navLink: HTMLAnchorElement = nav.querySelector(
      '.tab-btn[data-target="list-' + type + '"]'
    );
    const url: string = navLink.dataset.url;

    const reload = () => {
      $.get(
        url,
        {
          page: page,
          avatar: type === "avatar",
          token: type === "token",
        },
        (response: string) => {
          list.innerHTML = response;

          list
            .querySelectorAll(".page-link")
            .forEach((pageLink: HTMLElement) => {
              pageLink.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();
                page = parseInt(pageLink.dataset.page, 10);

                reload();
              });
            });

          list
            .querySelectorAll("img[data-path]")
            .forEach((img: HTMLImageElement) => {
              img.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();

                const type: string = img.dataset.type;
                const path: string = img.dataset.path;

                if (type === "avatar") {
                  this.setAvatarUrl(path);
                } else {
                  this.setTokenUrl(path);
                }

                this.openTarget("editor");
              });
            });

          list
            .querySelector(".back-btn")
            .addEventListener("click", (e: MouseEvent) => {
              this.openTarget("editor");
            });
        }
      );
    };

    container.append(list);
    reload();
  }

  protected removeTabs() {
    const tabs: string[] = [
      "frame-avatar",
      "frame-token",
      "list-avatar",
      "list-token",
    ];
    const container: HTMLElement = document.getElementById("target-container");

    for (const i in tabs) {
      const tab: string = tabs[i];

      const elt: HTMLElement = container.querySelector("#content-" + tab);

      if (elt) {
        elt.remove();
      }
    }

    container.querySelector("#content-editor").classList.add("d-none");
  }

  protected initQuickbar() {
    const list: HTMLElement = document.getElementById("token-quickbar");
    const url: string = list.dataset.url;

    $.get(
      url,
      {
        page: 1,
        avatar: true,
        token: true,
      },
      (response: string) => {
        list.innerHTML = response;

        list
          .querySelectorAll(".avatar-latest img")
          .forEach((img: HTMLImageElement) => {
            img.addEventListener("click", (e: MouseEvent) => {
              e.preventDefault();

              const path: string = img.dataset.path;

              if (img.dataset.type === "avatar") {
                this.setAvatarUrl(path, true);
              } else {
                this.setTokenUrl(path, true);
              }
            });
          });
      }
    );
  }

  protected initLock() {
    const $lock = $("#avatar-lock");
    $lock.prop("title", "Unlock");

    $lock.on("click", (e) => {
      e.preventDefault();

      if ($lock.hasClass("is-locked")) {
        $lock.removeClass("is-locked");
        $lock.prop("title", "Lock");
        this.linked = false;
      } else {
        $lock.addClass("is-locked");
        $lock.prop("title", "Unlock");

        this.linked = true;

        this.token.x(this.avatar.x());
        this.token.y(this.avatar.y());
        this.token.position({
          x: this.avatar.x(),
          y: this.avatar.y(),
        });
        this.token.scaleX(this.avatar.scaleX());
        this.token.scaleY(this.avatar.scaleY());

        this.stage.batchDraw();
      }
    });
  }

  protected initSave() {
    const container: HTMLElement = document.querySelector(".avatar-editor");
    const isApp: string = container.dataset.app;

    if (isApp === "1") {
      this.isApp = true;
    } else {
      this.isApp = false;
    }

    if (container.dataset.tableId) {
      this.tableId = container.dataset.tableId;
    }

    const $saveBtn = $(container).find("#save-btn");

    $saveBtn.on("click", (e) => {
      e.preventDefault();

      if (this.isSaving) {
        return;
      }

      this.isSaving = true;

      $saveBtn.prop("disabled", true);
      $saveBtn.removeClass("btn-primary");
      $saveBtn.addClass("btn-secondary");

      $saveBtn.html('<i class="fas fa-spinner fa-spin"></i>');

      this.onSave();
    });

    container
      .querySelector("#cancel-btn")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        const cid: string = (
          container.querySelector('input[name="cid"]') as HTMLInputElement
        ).value;

        if (window.parent) {
          const event = new CustomEvent("close-avatar-popin", {
            detail: {
              cid: cid,
            },
          });

          window.parent.document.dispatchEvent(event);
        }
      });
  }

  public updateFrames() {
    if (!this.previewFrameAvatarImg) {
      return;
    }

    if (!this.avatarFrame) {
      this.previewFrameAvatarImg.classList.add("d-none");
    } else {
      this.previewFrameAvatarImg.classList.remove("d-none");
      this.previewFrameAvatarImg.src = "/assets/frame/" + this.avatarFrame;
    }

    if (!this.tokenFrame) {
      this.previewFrameTokenImg.classList.add("d-none");
    } else {
      this.previewFrameTokenImg.classList.remove("d-none");
      this.previewFrameTokenImg.src = "/assets/frame/" + this.tokenFrame;
    }
  }

  public async updatePreview() {
    const avatar: Blob = await this.getAvatarBlob();
    const token: Blob = this.getTokenBlob();

    const previewContainer: HTMLElement =
      document.getElementById("avatar-preview");

    if (!this.previewAvatarImg) {
      this.previewAvatarImg = new Image();
      this.previewAvatarImg.width = 190;
      this.previewAvatarImg.height = 250;
      this.previewAvatarImg.classList.add("avatar-preview-img");

      this.previewFrameAvatarImg = new Image();
      this.previewFrameAvatarImg.classList.add("avatar-frame");

      previewContainer.append(this.previewAvatarImg);
      previewContainer.append(this.previewFrameAvatarImg);
    }

    if (!this.previewTokenImg) {
      this.previewTokenImg = new Image();
      this.previewTokenImg.width = 200;
      this.previewTokenImg.height = 200;
      this.previewTokenImg.classList.add("token-preview-img");

      this.previewFrameTokenImg = new Image();
      this.previewFrameTokenImg.classList.add("token-frame");

      previewContainer.append(this.previewTokenImg);
      previewContainer.append(this.previewFrameTokenImg);
    }

    this.previewAvatarImg.src = URL.createObjectURL(avatar);
    this.previewTokenImg.src = URL.createObjectURL(token);

    this.updateFrames();
  }

  protected getAvatarBlob(): Promise<Blob> {
    this.avatarTransformer.hide();
    this.avatarRect.hide();
    /*
        const ratioX = 1 / this.avatar.scaleX();
        const ratioY = 1 / this.avatar.scaleY();

        let x = (this.getAvatarRectX() - this.avatar.x()) * ratioX;
        let y = (this.getAvatarRectY() - this.avatar.y()) * ratioY;
        let w = TokenEditor.AvatarWidth * ratioX;
        let h = TokenEditor.AvatarHeight * ratioY;

        let x = (this.getAvatarRectX() - this.avatar.x()) / this.avatar.scaleX();
        let y = (this.getAvatarRectY() - this.avatar.y()) / this.avatar.scaleY();

        const imageRatio = this.avatar.width() / this.avatar.height();

        let w = 50 / this.avatar.scaleX();
        let h = 50 / this.avatar.scaleY();

        const avatarBefore: any = {
            x: this.avatar.x(),
            y: this.avatar.y(),
            width: this.avatar.width(),
            height: this.avatar.height()
        };

        this.stage.toDataURL({
            x: this.getAvatarRectX(),
            y: this.getAvatarRectY(),
            width: TokenEditor.AvatarWidth,
            height: TokenEditor.AvatarHeight,
            mimeType: 'image/png'
        })

        this.avatar.crop({
            x: x,
            y: y,
            width: w,
            height: h
        });*/

    this.stage.batchDraw();

    return new Promise<Blob>((resolve: Function, reject: Function) => {
      this.stage.toDataURL({
        x: this.getAvatarRectX(),
        y: this.getAvatarRectY(),
        width: TokenEditor.AvatarWidth,
        height: TokenEditor.AvatarHeight,
        mimeType: "image/png",
        callback: (url: string) => {
          const avatarBlob = this.urlToBlob(url);

          this.avatarTransformer.show();
          this.avatarRect.show();
          this.stage.batchDraw();

          return resolve(avatarBlob);
        },
      });
    });
  }

  protected markAsEdited() {
    this.isEdited = true;
    clearTimeout(this.previewTimeout);

    this.previewTimeout = setTimeout(() => {
      this.updatePreview();
    }, 200);
  }

  protected getTokenBlob(): Blob {
    if (this.tokenTransformer) {
      this.tokenTransformer.hide();
    }

    this.applyTokenMask();

    this.stage.batchDraw();

    const tokenDataUrl = this.tokenGroup.toDataURL({
      mimeType: "image/png",
      width: TokenEditor.TokenSize,
      height: TokenEditor.TokenSize,
      x:
        TokenEditor.Width / 2 +
        TokenEditor.Width / 4 -
        TokenEditor.TokenSize / 2,
      y: TokenEditor.Height / 2 - TokenEditor.TokenSize / 2,
    });

    const tokenBlob = this.urlToBlob(tokenDataUrl);

    this.removeTokenMask();

    if (this.tokenTransformer) {
      this.tokenTransformer.show();
    }

    this.stage.batchDraw();

    return tokenBlob;
  }

  protected async onSave() {
    if (!this.avatar) {
      return;
    }

    if (this.isEdited) {
      const avatarBlob: Blob = await this.getAvatarBlob();
      const tokenBlob: Blob = this.getTokenBlob();

      const formData = new FormData();
      formData.append("media[]", avatarBlob, "avatar.png");
      formData.append("media[]", tokenBlob, "token.png");

      const url = window["configuration"]["cdnUrl"] + "/upload";

      $.ajax({
        url: url,
        type: "POST",
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        xhrFields: {
          withCredentials: true,
        },
        crossDomain: true,
      }).done((data) => {
        const response = JSON.parse(data);

        let avatarUrl: string;
        let tokenUrl: string;

        response.forEach((entry: any) => {
          if (entry.filename.startsWith("token")) {
            tokenUrl = entry.path;
          } else {
            avatarUrl = entry.path;
          }
        });

        const form: HTMLFormElement = document.getElementById(
          "submit-avatar-form"
        ) as HTMLFormElement;

        (form.querySelector('[name="avatarUrl"]') as HTMLInputElement).value =
          avatarUrl;
        (form.querySelector('[name="tokenUrl"]') as HTMLInputElement).value =
          tokenUrl;
        (
          form.querySelector('[name="avatarFrameId"]') as HTMLInputElement
        ).value = this.avatarFrameId ? this.avatarFrameId.toString(10) : "";
        (
          form.querySelector('[name="tokenFrameId"]') as HTMLInputElement
        ).value = this.tokenFrameId ? this.tokenFrameId.toString(10) : "";
        (form.querySelector('[name="isEdited"]') as HTMLInputElement).value =
          "1";
        (form.querySelector('[name="isApp"]') as HTMLInputElement).value = this
          .isApp
          ? "1"
          : "0";

        form.submit();
      });
    } else {
      const form: HTMLFormElement = document.getElementById(
        "submit-avatar-form"
      ) as HTMLFormElement;

      (form.querySelector('[name="avatarUrl"]') as HTMLInputElement).value =
        this.currentAvatarUrl;
      (form.querySelector('[name="tokenUrl"]') as HTMLInputElement).value =
        this.currentTokenUrl;
      (form.querySelector('[name="isEdited"]') as HTMLInputElement).value = "0";
      (form.querySelector('[name="avatarFrameId"]') as HTMLInputElement).value =
        this.avatarFrameId ? this.avatarFrameId.toString(10) : "";
      (form.querySelector('[name="tokenFrameId"]') as HTMLInputElement).value =
        this.tokenFrameId ? this.tokenFrameId.toString(10) : "";
      (form.querySelector('[name="isApp"]') as HTMLInputElement).value = this
        .isApp
        ? "1"
        : "0";

      form.submit();
    }
  }

  protected urlToBlob(url: string): Blob {
    const binary = atob(url.split(",")[1]);
    const arr = [];
    let i = 0;

    while (i < binary.length) {
      arr.push(binary.charCodeAt(i));
      i++;
    }

    return new Blob([new Uint8Array(arr)], {
      type: "image/png",
    });
  }

  protected getFullUrl(url: string): string {
    return (
      window["configuration"]["cdnReadUrl"] +
      "/" +
      url +
      "?no-cache=" +
      (+Date.now()).toString(10)
    );
  }

  public setAvatarUrl(url: string, isDefault = false) {
    if (this.avatar) {
      this.avatar.remove();
      this.avatarTransformer.remove();
    }

    const imageObj = new Image();
    imageObj.setAttribute("crossOrigin", "Anonymous");

    imageObj.onload = (e) => {
      const ratio: number = imageObj.width / imageObj.height;
      let width: number;
      let height: number;

      if (ratio > 1) {
        width = 190;
        height = width * (imageObj.height / imageObj.width);
      } else {
        height = 250;
        width = height * ratio;
      }

      this.avatar = new Konva.Image({
        x: TokenEditor.Width / 4 - width / 2,
        y: TokenEditor.Height / 2 - height / 2,
        image: imageObj,
        width: imageObj.width,
        height: imageObj.height,
        scaleX: width / imageObj.width,
        scaleY: height / imageObj.height,
        draggable: true,
      });

      this.avatarTransformer = new Konva.Transformer({
        rotateEnabled: false,
      });
      this.avatarTransformer.attachTo(this.avatar);

      this.avatarGroup.add(this.avatar);
      this.avatarGroup.add(this.avatarTransformer);
      this.stage.batchDraw();

      this.avatar.on("dragmove", (e) => {
        this.markAsEdited();

        if (this.linked && this.token) {
          this.token.x(this.avatar.x());
          this.token.y(this.avatar.y());
        }
      });

      this.avatar.on("transform", (e) => {
        this.markAsEdited();

        if (this.linked && this.token) {
          this.token.position({
            x: this.avatar.x(),
            y: this.avatar.y(),
          });
          this.token.scaleX(this.avatar.scaleX());
          this.token.scaleY(this.avatar.scaleY());
        }
      });

      this.currentAvatarUrl = url;

      this.markAsEdited();

      if (isDefault) {
        this.isEdited = false;
      }
    };

    imageObj.src = this.getFullUrl(url);
  }

  public setTokenUrl(url: string, isDefault = false) {
    if (this.token) {
      this.token.remove();
      this.tokenTransformer.remove();
    }

    const imageObj = new Image();
    imageObj.setAttribute("crossOrigin", "Anonymous");

    imageObj.onload = (e) => {
      const ratio: number = imageObj.width / imageObj.height;
      let width: number;
      let height: number;

      if (ratio > 1) {
        width = 200;
        height = width * (imageObj.height / imageObj.width);
      } else {
        height = 200;
        width = height * ratio;
      }

      this.token = new Konva.Image({
        x: TokenEditor.Width / 4 - width / 2,
        y: TokenEditor.Height / 2 - height / 2,
        image: imageObj,
        width: imageObj.width,
        height: imageObj.height,
        scaleX: width / imageObj.width,
        scaleY: height / imageObj.height,
        draggable: true,
      });

      this.tokenTransformer = new Konva.Transformer({
        rotateEnabled: false,
      });
      this.tokenTransformer.attachTo(this.token);

      this.tokenGroup.add(this.token);
      this.tokenGroup.add(this.tokenTransformer);

      this.stage.batchDraw();

      this.token.on("dragmove", (e) => {
        this.markAsEdited();

        if (this.linked && this.avatar) {
          this.avatar.x(this.token.x());
          this.avatar.y(this.token.y());
        }
      });

      this.token.on("transform", (e) => {
        this.markAsEdited();

        if (this.linked && this.avatar) {
          this.avatar.position({
            x: this.token.x(),
            y: this.token.y(),
          });
          this.avatar.scaleX(this.token.scaleX());
          this.avatar.scaleY(this.token.scaleY());
        }
      });

      this.currentTokenUrl = url;

      this.markAsEdited();

      if (isDefault) {
        this.isEdited = false;
      }
    };

    imageObj.src = this.getFullUrl(url);
  }

  public setDefaultAvatar(url: string) {
    this.setAvatarUrl(url, true);
  }

  public setDefaultAvatarFrame(id: number, path: string) {
    this.avatarFrame = path;
    this.avatarFrameId = id;

    this.updateFrames();
  }

  public setDefaultTokenFrame(id: number, path: string) {
    this.tokenFrame = path;
    this.tokenFrameId = id;

    this.updateFrames();
  }

  public setDefaultToken(url: string) {
    this.setTokenUrl(url, true);
  }

  protected applyTokenMask() {
    this.tokenGroup.clipFunc((ctx: CanvasRenderingContext2D) => {
      ctx.arc(
        TokenEditor.Width / 4,
        TokenEditor.Height / 2,
        TokenEditor.TokenSize / 2,
        0,
        Math.PI * 2,
        false
      );
    });

    this.stage.batchDraw();
  }

  protected removeTokenMask() {
    this.tokenGroup.clipFunc(null);
  }

  protected getAvatarRectX(): number {
    return TokenEditor.Width / 4 - TokenEditor.AvatarWidth / 2;
  }

  protected getAvatarRectY(): number {
    return TokenEditor.Height / 2 - TokenEditor.AvatarHeight / 2;
  }

  protected getTokenCircleX(): number {
    return (
      TokenEditor.Width / 2 + TokenEditor.Width / 4 + TokenEditor.TokenSize / 2
    );
  }

  protected getTokenCircleY(): number {
    return TokenEditor.Height / 2 + TokenEditor.TokenSize / 2;
  }

  protected initAvatar() {
    this.avatarRect = new Konva.Rect({
      width: TokenEditor.AvatarWidth,
      height: TokenEditor.AvatarHeight,
      x: this.getAvatarRectX(),
      y: this.getAvatarRectY(),
      stroke: "#666",
      strokeWidth: 3,
      listening: false,
    });

    this.layer.add(this.avatarRect);
  }

  protected initToken() {
    const radius: number = TokenEditor.TokenSize / 2;

    const crop: Konva.Circle = new Konva.Circle({
      radius: radius,
      x: this.getTokenCircleX() - radius,
      y: this.getTokenCircleY() - radius,
      stroke: "#666",
      strokeWidth: 3,
      listening: false,
    });

    this.layer.add(crop);
  }

  protected initUploads() {
    const url = window["configuration"]["cdnUrl"] + "/upload";
    const $form = $(".uploader-container");
    const errorContainer: HTMLElement = document.getElementById("error-upload");

    const useAsAvatar: HTMLInputElement = document.getElementById(
      "use-as-avatar"
    ) as HTMLInputElement;
    const useAsToken: HTMLInputElement = document.getElementById(
      "use-as-token"
    ) as HTMLInputElement;
    const label: HTMLElement = document.querySelector(".file-uploader-label");

    $form.find('[type="file"]').on("change", (e) => {
      label.classList.add("is-uploading");
      errorContainer.classList.add("d-none");

      $.ajax({
        url: url,
        type: "POST",
        data: new FormData($form[0] as HTMLFormElement),
        cache: false,
        contentType: false,
        processData: false,
        xhrFields: {
          withCredentials: true,
        },
        crossDomain: true,
      })
        .done((data) => {
          const response = JSON.parse(data);

          if (response.length > 0) {
            const url = response[0].path;

            if (useAsAvatar.checked && useAsToken.checked) {
              this.setAvatarUrl(url);
              this.setTokenUrl(url);
            } else if (useAsAvatar.checked) {
              this.setAvatarUrl(url);
            } else if (useAsToken.checked) {
              this.setTokenUrl(url);
            } else {
              this.setAvatarUrl(url);
              this.setTokenUrl(url);
            }
          }
        })
        .fail((xhr, ajaxOptions, thrownError) => {
          const content = xhr.responseText;
          let message = "An error occurred";

          try {
            const error: any = JSON.parse(content);
            message = error.message;
          } catch (e) {
            console.error(e);
          }

          errorContainer.innerText = message;
          errorContainer.classList.remove("d-none");

          setTimeout(() => {
            errorContainer.classList.add("d-none");
          }, 5000);
        })
        .always(() => {
          label.classList.remove("is-uploading");
        });
    });
  }
}

window["tokenEditor"] = TokenEditor;
