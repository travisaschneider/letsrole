import { Component } from "./Component";
import { SharedAdapter } from "../SharedAdapter";
import { CraftSheet } from "../CraftSheet";

export class Avatar extends Component {
  public static readonly icon: string = "fas fa-user";
  public static readonly widgetName: string = "Avatar";
  public static readonly attributeTemplate = "attribute-avatar.html.njk";

  public initWidgetOptions(container: HTMLElement) {
    super.initWidgetOptions(container);

    const id: HTMLElement = container.querySelector("#attr-id");

    id.insertAdjacentHTML(
      "afterend",
      '<small class="form-text text-muted">Use "avatar" for character sheets</small>'
    );
  }

  public render(): string {
    let html = `
            <div class="d-flex flex-column widget avatar ${this.e(
              this.widgetClasses
            )}" ${this.renderAttributes}>
            <div class="avatar-container">
            <img src="${
              window["configuration"].cdnReadUrl
            }/static/default-avatar.png" class="avatar-img">`;

    if (!this.readOnly && !this.isMobile) {
      html += `<a class="edit" href="#"><i class="fas fa-edit"></i></a>`;
    }

    html += `</div>
            <div class="token-container d-none">
            <img src="${window["configuration"].cdnReadUrl}/static/default-token.png" class="token-img">
        `;

    if (!this.readOnly && !this.isMobile) {
      html += `<a class="edit" href="#"><i class="fas fa-edit"></i></a>`;
    }

    let switchAnchors = `<div class="d-flex flex-row justify-content-around">
        <a href="#" class="switch switch-avatar">${this.translate("Avatar")}</a>
        <a href="#" class="switch switch-token">${this.translate("Token")}</a>
      </div>`;

    if (this.isMobile) {
      switchAnchors = "<br>";
    }

    html += `</div>${switchAnchors}</div>`;

    return html;
  }

  public getClasses(): string[] {
    const classes = super.getClasses();
    classes.push("persist");

    return classes;
  }

  public reverseTransform(value: any): any {
    if (!value) {
      return;
    }

    const avatar: HTMLImageElement = this.element.querySelector(
      ".avatar-img"
    ) as HTMLImageElement;
    const token: HTMLImageElement = this.element.querySelector(
      ".token-img"
    ) as HTMLImageElement;

    avatar.src = window["configuration"]["cdnReadUrl"] + "/" + value.avatar;
    token.src = window["configuration"]["cdnReadUrl"] + "/" + value.token;

    if (value.frame) {
      if (value.frame.avatar != null) {
        let avatarFrame: HTMLElement = this.element.querySelector(
          ".avatar-container .avatar-frame"
        );

        if (!avatarFrame) {
          avatarFrame = document.createElement("div");
          avatarFrame.classList.add("avatar-frame");
          this.element.querySelector(".avatar-container").prepend(avatarFrame);
        }

        avatarFrame.innerHTML =
          '<img src="/assets/frame/' + value.frame.avatar + '">';
      }

      if (value.frame.token != null) {
        let tokenFrame: HTMLElement = this.element.querySelector(
          ".token-container .token-frame"
        );

        if (!tokenFrame) {
          tokenFrame = document.createElement("div");
          tokenFrame.classList.add("token-frame");
          this.element.querySelector(".token-container").prepend(tokenFrame);
        }

        tokenFrame.innerHTML =
          '<img src="/assets/frame/' + value.frame.token + '">';
      }

      this.element.classList.add("with-frame");
    }

    return value;
  }

  public initialize(element: HTMLElement) {
    super.initialize(element);

    const avatarContainer = element.querySelector(".avatar-container");
    const tokenContainer = element.querySelector(".token-container");

    let editUrl: string;
    let eventName: string;
    let isCraft = false;

    if (this.sheet instanceof CraftSheet) {
      eventName = "open-craft-avatar-popin";
      isCraft = true;
    } else {
      eventName = "open-avatar-popin";
    }

    if (window["app_mode"] === "app") {
      editUrl = window["configuration"]["avatarEditUrl"];
    } else {
      editUrl = window["configuration"]["avatarEditOnSiteUrl"];
      eventName = "open-avatar-site-popin";
    }

    element.querySelectorAll("a.edit").forEach((editLink: HTMLElement) => {
      editLink = editLink as HTMLLinkElement;
      editLink.setAttribute("href", editUrl);

      editLink.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        SharedAdapter.eventDispatcher.emit(eventName, {
          url: editLink.getAttribute("href"),
          cid: this.sheet.id,
          property: this.id,
          craft: isCraft,
        });
      });
    });

    const switchToken: HTMLAnchorElement = element.querySelector(
      ".switch.switch-token"
    );

    const switchAvatar: HTMLAnchorElement = element.querySelector(
      ".switch.switch-avatar"
    );

    if (switchToken) {
      switchToken.addEventListener("click", (e) => {
        e.preventDefault();

        avatarContainer.classList.add("d-none");
        tokenContainer.classList.remove("d-none");
      });
    }

    if (switchAvatar) {
      switchAvatar.addEventListener("click", (e) => {
        e.preventDefault();

        avatarContainer.classList.remove("d-none");
        tokenContainer.classList.add("d-none");
      });
    }
  }
}
