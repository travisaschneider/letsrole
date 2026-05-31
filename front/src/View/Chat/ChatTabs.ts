import { User } from "../../Entity/User";
import { ChatView } from "../ChatView";

export interface ChatTab {
  user: User;
  open: boolean;
  container: HTMLElement;
  element: HTMLElement;
  notifications?: number;
}

export class ChatTabs {
  protected container: HTMLElement;
  protected tabs: ChatTab[] = [];
  protected view: ChatView;
  protected _currentTab: ChatTab;

  protected allElement: HTMLElement;
  protected allNotifications = 0;

  public constructor(container: HTMLElement, view: ChatView) {
    this.container = container;
    this.view = view;
  }

  public open(user: User): ChatTab {
    let tab: ChatTab;

    this.tabs.forEach((openedTab: ChatTab) => {
      openedTab.open = false;

      if (openedTab.user.id === user.id) {
        tab = openedTab;
      }
    });

    if (!tab) {
      tab = {
        user: user,
        open: true,
        container: this.view.createContainer(user.id),
        element: null,
      };

      this.tabs.push(tab);
    } else {
      tab.open = true;
    }

    this._currentTab = tab;
    this.clearNotify(this._currentTab);

    this.render();

    return tab;
  }

  public render(): void {
    if (this.tabs.length === 0) {
      this.view.getDefaultContainer().classList.remove("d-none");
      this.container.classList.add("d-none");
      (this.container.parentElement as HTMLElement).classList.remove(
        "with-tabs"
      );
      return;
    } else {
      (this.container.parentElement as HTMLElement).classList.add("with-tabs");
    }

    const resetTabs = () => {
      elements.forEach((element: HTMLElement) => {
        element.classList.remove("active");
      });
    };

    const resetContainers = () => {
      this.view.getDefaultContainer().classList.add("d-none");

      this.tabs.forEach((tab: ChatTab) => {
        tab.container.classList.add("d-none");
      });
    };

    resetContainers();

    this.container.innerHTML = "";
    const names: HTMLAnchorElement[] = [];
    const elements: HTMLElement[] = [];

    const allElement: HTMLElement = document.createElement("section");
    allElement.classList.add("all");

    const name: HTMLAnchorElement = document.createElement("a");
    name.href = "#";
    name.dataset.id = "";
    name.classList.add("name");
    name.classList.add("name-only");
    name.innerText = "All";

    const notify: HTMLSpanElement = document.createElement("span");

    if (this.allNotifications > 0) {
      notify.innerText = " (" + this.allNotifications.toString(10) + ")";
    }

    name.append(notify);

    allElement.append(name);
    this.container.append(allElement);

    names.push(name);
    elements.push(allElement);

    this.tabs.forEach((tab: ChatTab) => {
      const element: HTMLElement = document.createElement("section");

      if (tab.open) {
        tab.container.classList.remove("d-none");
        element.classList.add("active");
      } else {
        tab.container.classList.add("d-none");
      }

      const name: HTMLAnchorElement = document.createElement("a");
      name.href = "#";
      name.classList.add("name");
      name.innerText = tab.user.chatname;
      name.dataset.id = tab.user.id.toString(10);

      const notify: HTMLSpanElement = document.createElement("span");

      if (tab.notifications > 0) {
        notify.innerText = " (" + tab.notifications.toString(10) + ")";
      }

      name.append(notify);

      const close: HTMLAnchorElement = document.createElement("a");
      close.href = "#";
      close.classList.add("close-pm");
      close.dataset.id = name.dataset.id;
      close.innerText = "✕";

      close.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        const target: HTMLElement = e.currentTarget as HTMLElement;

        this.remove(tab);
        this.view.resetChat(Number(target.dataset.id));
      });

      element.append(name, close);

      elements.push(element);
      names.push(name);

      tab.element = element;

      this.container.append(element);
    });

    names.forEach((link: HTMLAnchorElement) => {
      link.addEventListener("click", (e: MouseEvent) => {
        const target: HTMLElement = e.currentTarget as HTMLElement;
        e.preventDefault();
        resetContainers();
        resetTabs();

        target.closest("section").classList.add("active");
        const id: number = parseInt(target.dataset.id, 10);
        const tab: ChatTab = this.getTab(id);
        let container: HTMLElement;

        if (tab === null) {
          container = this.view.getDefaultContainer();
          this._currentTab = null;
        } else {
          container = tab.container;
          this._currentTab = tab;
        }

        this.clearNotify(this._currentTab);

        container.classList.remove("d-none");

        this.view.scrollToLastMessage();
      });
    });

    this.container.classList.remove("d-none");
  }

  public remove(tab: ChatTab) {
    const index: number = this.tabs.indexOf(tab);

    if (index > -1) {
      tab.container.remove();
      this.tabs.splice(index, 1);
      this.render();
    }
  }

  public notify(tab: ChatTab = null) {
    if (tab) {
      if (!tab.notifications) {
        tab.notifications = 1;
      } else {
        tab.notifications++;
      }

      if (!tab.element) {
        return;
      }

      if (tab === this._currentTab) {
        return this.clearNotify(tab);
      }

      const notify: HTMLSpanElement = tab.element.querySelector(".name span");
      notify.innerText = " (" + tab.notifications.toString(10) + ")";

      return;
    }

    if (this._currentTab == null) {
      return this.clearNotify();
    }

    this.allNotifications++;
    const notify: HTMLSpanElement =
      this.container.querySelector(".all .name span");

    if (notify) {
      notify.innerText = " (" + this.allNotifications.toString(10) + ")";
    }
  }

  public clearNotify(tab: ChatTab = null) {
    if (tab) {
      tab.notifications = 0;

      if (!tab.element) {
        return;
      }

      const notify: HTMLSpanElement = tab.element.querySelector(".name span");
      notify.innerText = "";

      return;
    }

    this.allNotifications = 0;
    const notify: HTMLSpanElement =
      this.container.querySelector(".all .name span");

    if (notify) {
      notify.innerText = "";
    }
  }

  public getTab(id: number) {
    for (const i in this.tabs) {
      const tab: ChatTab = this.tabs[i];

      if (tab.user.id === id) {
        return tab;
      }
    }

    return null;
  }

  public get currentTab(): ChatTab {
    return this._currentTab;
  }
}
