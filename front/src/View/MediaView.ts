import { injectable } from "inversify";
import { View } from "./View";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { UserState } from "../State/UserState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { MenuView } from "./MenuView";
import { Views } from "../DependencyInjection/Views";
import { Template } from "./Template";
import { PopinManager } from "./Popin/PopinManager";
import { Services } from "../DependencyInjection/Services";
import { Popin } from "./Popin/Popin";
import {
  FolderSort,
  Media,
  MediaSearchSort,
  MediaSearchSortDirection,
  MediaSearchType,
} from "../../shared/Media";
import { SceneState } from "../State/SceneState";
import { JournalView } from "./JournalView";
import { ImageDropMode } from "./SceneView";
import {
  MediaValidation,
  MediaValidationScope,
  MediaValidationStatus,
} from "./Media/MediaValidation";

@injectable()
export class MediaView extends View {
  protected static readonly PreferenceStorageKey: string =
    "media-manager-preferences";

  protected tab: MediaTab = MediaTab.My;
  protected taskBarItem: TaskBarItem;
  protected types: MediaType[];
  protected displayMode: DisplayMode = DisplayMode.Thumbnail;
  protected folderSort: FolderSort = FolderSort.Date;
  protected query: MediaQuery = {};
  protected cols: ThumbCols = 3;

  protected autoScrollEnabled = true;
  protected autoScrollLoading = false;
  protected isPartnerInit = false;
  protected isUnlockedInit = false;

  protected onPick: Function = null;

  public init() {
    super.init();

    this.types = [
      { type: "", label: this.__("All types") },
      { type: "image", label: this.__("Images") },
      { type: "video", label: this.__("Videos") },
      { type: "animated", label: this.__("Animated images") },
      { type: "avatartoken", label: this.__("Avatars & tokens") },
    ];

    EventDispatcher.on(Events.USER_ME_LOADED, (e) => {
      if (this.getUserState().isGm()) {
        this.initialize();
      }
    });
  }

  protected initialize(): void {
    this.taskBarItem = new TaskBarItem(
      this.__("Media Manager"),
      "fas fa-photo-video",
      TaskBarCategory.Content
    );

    this.getTaskBarView().add(this.taskBarItem);

    this.taskBarItem.onClick(() => {
      if (this.taskBarItem.isActive()) {
        this.taskBarItem.desactivate();
      } else {
        this.taskBarItem.activate();
        this.getTaskBarView().closeMenu();
        this.openMediaManager();
      }
    });
  }

  public openMediaManager(onPick: Function = null) {
    const already = this.getPopinManager().get("media-manager");

    if (already) {
      already.close(true);
    }

    const popin = this.getPopinManager().create({
      id: "media-manager",
      html: Template.render("media/layout.html.njk", {
        media_types: this.types,
      }),
      title: this.__("Media Manager"),
      minHeight: 550,
      minWidth: 700,
      width: 700,
      icon: "fas fa-photo-video",
      canDock: false,
      canMinimize: false,
    });

    this.onPick = onPick;

    popin.on("init", (e) => {
      popin.forceHeight();
      this.initPopin(popin);
    });

    popin.on("close", (e) => {
      this.taskBarItem.desactivate();
    });

    popin.open();
  }

  protected initPopin(popin: Popin) {
    this.query.page = 1;
    this.query.q = null;

    this.initTabs(popin);
    this.initQuery(popin);
    this.initDisplayMode(popin);
    this.initTypeFilter(popin);
    this.initSearch(popin);
    this.initUpload(popin);
    this.initErrors(popin);
    this.initFolderActions(popin);

    this.renderDisplayMode(popin);

    this.loadFolders(popin);
    this.load(popin);
    this.reloadStorage(popin);
    this.initAutoScroll(popin);
  }

  protected initTabs(popin: Popin) {
    const container: HTMLElement = popin.getElement();
    const tabs: HTMLElement = container.querySelector(".tabs");

    const clearTabs = () => {
      container
        .querySelectorAll(".tab-content")
        .forEach((content: HTMLElement) => {
          content.classList.add("d-none");
        });

      container
        .querySelectorAll(".tabs .tab")
        .forEach((tab: HTMLAnchorElement) => {
          tab.classList.remove("active");
        });
    };

    tabs.querySelectorAll(".tab").forEach((tab: HTMLAnchorElement) => {
      const target: string = tab.hash.replace("#", "");

      tab.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        clearTabs();
        container.querySelector("." + target).classList.remove("d-none");
        tab.classList.add("active");

        if (target === "partner-content") {
          if (!this.isPartnerInit) {
            this.initPartners(popin);
          }
        }

        if (target === "unlocked-content") {
          if (!this.isUnlockedInit) {
            this.initUnlocked(popin);
          }
        }
      });
    });
  }

  protected initUnlocked(popin: Popin) {
    const main: HTMLElement = popin
      .getElement()
      .querySelector("#unlocked-medias");

    this.getClient().get("media", "packs", {}, (response: any) => {
      const container: HTMLElement = popin
        .getElement()
        .querySelector("#unlocked-packs");

      const disableActivePacks = () => {
        container
          .querySelectorAll(".media-pack")
          .forEach((mediaPack: HTMLElement) => {
            mediaPack.classList.remove("active");
          });
      };

      container.innerHTML = Template.render("media/unlocked-folders.html.njk", {
        packs: response.packs,
      });

      container
        .querySelectorAll(".media-pack")
        .forEach((mediaPack: HTMLElement) => {
          mediaPack.addEventListener("click", (e: MouseEvent) => {
            disableActivePacks();
            mediaPack.classList.add("active");

            const id: number = parseInt(mediaPack.dataset.id);
            loadMedias(id);
          });
        });
    });

    const loadMedias = (packId: number) => {
      this.getClient().get(
        "media",
        "loadPackMedias",
        {
          id: packId,
        },
        (response) => {
          const pack: any = response.pack;
          const medias: any[] = pack.medias;

          main.innerHTML = Template.render("media/unlocked-layout.html.njk", {
            pack: pack,
          });

          const descriptionP: HTMLElement = main.querySelector("p.minimized");

          if (descriptionP) {
            descriptionP.addEventListener("click", (e: MouseEvent) => {
              descriptionP.classList.toggle("minimized");
            });
          }

          const mediasContainer: HTMLElement =
            main.querySelector("#medias-container");

          mediasContainer.innerHTML = Template.render(
            "media/unlocked-thumb.html.njk",
            {
              medias: medias,
              get_icon: this.getMediaIcon,
            }
          );

          mediasContainer
            .querySelectorAll(".media-entry")
            .forEach((entry: HTMLElement) => {
              this.initMediaEntryDragAndDrop(popin, entry);

              entry.addEventListener("contextmenu", (e: MouseEvent) => {
                e.preventDefault();

                this.openMediaContextual(
                  popin,
                  entry,
                  e,
                  ImageDropMode.Unlocked
                );
              });
            });
        }
      );
    };

    main.innerHTML = Template.render("media/unlocked-empty.html.njk");
  }

  protected initPartners(popin: Popin) {
    const main: HTMLElement = popin
      .getElement()
      .querySelector("#partner-medias");

    this.getClient().get("media", "loadPartners", {}, (response: any) => {
      const container: HTMLElement = popin
        .getElement()
        .querySelector("#partner-folder-tree");

      container.innerHTML = Template.render("media/partner-folders.html.njk", {
        partners: response.partners,
      });

      const unfold = (li: HTMLElement) => {
        if (li.classList.contains("open")) {
          li.classList.add("closed");
          li.classList.remove("open");
        } else {
          li.classList.remove("closed");
          li.classList.add("open");
        }

        this.savePreferences(popin);
      };

      const open = (id: number) => {
        this.openFolder(popin, id);
      };

      container.querySelectorAll("li").forEach((li: HTMLLIElement) => {
        li.addEventListener("click", (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          unfold(li);
        });
      });

      container
        .querySelectorAll("a[data-partner-id]")
        .forEach((link: HTMLAnchorElement) => {
          link.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();

            const partnerId: number = parseInt(link.dataset.partnerId, 10);
            let folderId: number = null;

            if (link.dataset.folderId) {
              folderId = parseInt(link.dataset.folderId, 10);
            }

            loadMedias(partnerId, folderId);
          });
        });
    });

    const loadMedias = (partnerId: number, folderId: number) => {
      this.getClient().get(
        "media",
        "loadPartnerMedias",
        {
          id: partnerId,
          folderId: folderId,
        },
        (response) => {
          const medias: any[] = response.medias;
          const partner: any = response.partner;

          if (!medias.length) {
            main.innerHTML = Template.render("media/partner-empty.html.njk");
            return;
          }

          const containerHtml: string = Template.render(
            "media/partner-layout.html.njk",
            {
              partner: partner,
            }
          );

          main.innerHTML = containerHtml;

          const mediasContainer: HTMLElement =
            main.querySelector("#medias-container");

          const html: string = Template.render("media/partner-thumb.html.njk", {
            medias: medias,
            get_icon: this.getMediaIcon,
          });

          mediasContainer.innerHTML = html;

          mediasContainer
            .querySelectorAll(".media-entry")
            .forEach((entry: HTMLElement) => {
              this.initMediaEntryDragAndDrop(popin, entry);
            });
        }
      );
    };

    main.innerHTML = Template.render("media/partner-empty.html.njk");
  }

  protected initAutoScroll(popin: Popin) {
    const container: HTMLElement = popin.getElement().querySelector("#medias");

    container.addEventListener(
      "scroll",
      (e: Event) => {
        applyAutoScroll();
      },
      {
        passive: true,
      }
    );

    container.addEventListener("render", (e: CustomEvent) => {
      applyAutoScroll();
    });

    const applyAutoScroll = () => {
      if (!this.autoScrollEnabled) {
        return;
      }

      if (this.autoScrollLoading) {
        return;
      }

      const inner: HTMLElement = container.lastElementChild as HTMLElement;
      const margin: number =
        inner.offsetHeight - container.scrollTop - container.offsetHeight;

      if (margin < 50) {
        if (!this.query.page) {
          this.query.page = 1;
        }

        this.query.page = this.query.page + 1;
        this.autoScrollLoading = true;
        this.load(popin);
      }
    };
  }

  protected initQuery(popin: Popin) {
    const preferences: MediaManagerPreferences = this.getPreferences();

    if (preferences.sort) {
      this.query.sort = preferences.sort;
    }

    if (preferences.sortDirection) {
      this.query.sort_direction = preferences.sortDirection;
    }
  }

  protected initFolderActions(popin: Popin) {
    // Filtering:
    const input: HTMLInputElement = popin
      .getElement()
      .querySelector("#folder-query");

    const apply = () => {
      const filter: string = input.value.trim();

      if (!filter) {
        this.clearFilterFolders(popin);
        return;
      }

      this.filterFolders(popin, filter);
    };

    input.addEventListener("keyup", (e: KeyboardEvent) => {
      apply();
    });

    input.addEventListener("change", (e: Event) => {
      apply();
    });

    // New folder:

    const createBtn: HTMLAnchorElement = popin
      .getElement()
      .querySelector(".new-folder-btn");

    createBtn.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      const root: HTMLLIElement = popin
        .getElement()
        .querySelector("#folder-tree > .root > li");
      this.createFolder(popin, root);
    });
  }

  protected renameMedia(popin: Popin, entry: HTMLElement) {
    const id: string = entry.dataset.id;
    const name: string = entry.querySelector(".name").textContent.trim();

    const newName: string = prompt(
      this.__("What name do you want to give to this media?"),
      name
    );

    if (!newName) {
      return;
    }

    if (newName == name) {
      return;
    }

    this.getClient().send("media", "update", {
      title: newName,
      id: id,
    });

    entry.querySelector(".name-container").textContent = newName;
  }

  protected renameFolder(popin: Popin, folder: HTMLLIElement) {
    const input: HTMLInputElement = document.createElement("input");
    input.classList.add("folder-input");

    const link: HTMLAnchorElement =
      folder.firstElementChild as HTMLAnchorElement;
    const folderId: number = parseInt(link.dataset.id, 10);
    const name: string = link.textContent.trim();

    input.value = name;

    const rename = () => {
      const name: string = input.value.trim();

      if (!name) {
        return;
      }

      this.getClient().get(
        "media",
        "renameFolder",
        {
          name: name,
          folderId: folderId,
        },
        async (response: any) => {
          await this.loadFolders(popin);
          this.openFolder(popin, folderId);
        }
      );
    };

    input.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        rename();
      }
    });

    input.addEventListener("blur", () => {
      rename();
    });

    link.replaceWith(input);
    input.focus();
  }

  protected createFolder(popin: Popin, parent: HTMLLIElement) {
    let parentId: number = null;
    let ul: HTMLUListElement = null;

    const link: HTMLAnchorElement =
      parent.firstElementChild as HTMLAnchorElement;

    if (link.dataset.id) {
      parentId = parseInt(link.dataset.id, 10);
    }

    const children: HTMLCollection = parent.children;

    for (let i = 0; i < children.length; i++) {
      if (children[i].tagName === "UL") {
        ul = children[i] as HTMLUListElement;
        break;
      }
    }

    if (!ul) {
      ul = document.createElement("ul");
      parent.append(ul);
    }

    parent.classList.remove("closed");
    parent.classList.add("open");
    parent.classList.add("has-children");

    const newLi: HTMLLIElement = document.createElement("li");
    newLi.classList.add("folder-edit");
    newLi.classList.add("closed");

    const icon: HTMLSpanElement = document.createElement("span");
    icon.classList.add("folder");

    const input: HTMLInputElement = document.createElement("input");
    input.classList.add("folder-input");

    newLi.append(icon);
    newLi.append(input);

    ul.append(newLi);

    const clear = () => {
      newLi.remove();
    };

    const create = () => {
      const name: string = input.value.trim();
      clear();

      if (!name) {
        return;
      }

      this.getClient().get(
        "media",
        "createFolder",
        {
          name: name,
          parentId: parentId,
        },
        async (response: any) => {
          const folderId: number = response.folderId;

          await this.loadFolders(popin);
          this.openFolder(popin, folderId);
        }
      );
    };

    input.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        create();
      }
    });

    input.addEventListener("blur", () => {
      create();
    });

    input.focus();
  }

  protected reloadStorage(popin: Popin) {
    this.getClient().get("media", "storage", {}, (response: any) => {
      const storage: any = response.storage;
      const container: HTMLElement = popin
        .getElement()
        .querySelector(".available-disk");

      container.innerHTML = Template.render("media/storage.html.njk", storage);
    });
  }

  protected clearFilterFolders(popin: Popin) {
    const tree: HTMLElement = popin.getElement().querySelector("#folder-tree");
    const preferences: MediaManagerPreferences = this.getPreferences();

    tree.querySelectorAll("li").forEach((li: HTMLLIElement) => {
      li.classList.remove("open");
      li.classList.remove("filtered");
      li.classList.remove("hide");
      li.classList.remove("children-filtered");

      li.classList.add("closed");

      const idStr: string = (li.firstElementChild as HTMLAnchorElement).dataset
        .id;

      if (!idStr) {
        // root
        li.classList.remove("closed");
        li.classList.add("open");
      }

      if (preferences.folders) {
        const id: number = parseInt(idStr, 10);

        if (preferences.folders[id] && preferences.folders[id].open) {
          li.classList.remove("closed");
          li.classList.add("open");
        }
      }
    });
  }

  protected filterFolders(popin: Popin, filter: string) {
    const tree: HTMLElement = popin.getElement().querySelector("#folder-tree");

    tree.querySelectorAll("li").forEach((li: HTMLLIElement) => {
      li.classList.remove("open");
      li.classList.remove("filtered");
      li.classList.remove("hide");
      li.classList.remove("children-filtered");
      li.classList.add("closed");
    });

    const openParents = (li: HTMLLIElement) => {
      let parent: HTMLElement = li.parentElement;

      while (parent && parent.id !== "folder-tree") {
        if (parent.classList.contains("closed")) {
          parent.classList.remove("closed");
          parent.classList.add("open");
          parent.classList.add("children-filtered");
        }

        parent = parent.parentElement;
      }
    };

    const q: string = filter.toLowerCase();

    tree.querySelectorAll("a").forEach((folder: HTMLAnchorElement) => {
      const name: string = folder.textContent.toLowerCase();
      const li: HTMLLIElement = folder.closest("li");

      if (name.indexOf(q) >= 0) {
        li.classList.add("filtered");
        openParents(li);
      } else {
        li.classList.add("hide");
      }
    });
  }

  protected loadFolders(popin: Popin): Promise<HTMLElement> {
    return new Promise((resolve: Function, reject: Function) => {
      this.getClient().get(
        "media",
        "folders",
        {
          sort: this.folderSort,
        },
        (response: any) => {
          const folders: any[] = response.folders;
          const container: HTMLElement = popin
            .getElement()
            .querySelector("#folder-tree");
          const preferences: MediaManagerPreferences = this.getPreferences();

          container.innerHTML = Template.render("media/folders.html.njk", {
            folders: folders,
            statuses: preferences.folders ?? {},
          });

          this.initFolders(popin);
          resolve(container);
        }
      );
    });
  }

  protected clearActiveFolder(popin: Popin) {
    const container: HTMLElement = popin
      .getElement()
      .querySelector("#folder-tree");

    container.querySelectorAll("li").forEach((li: HTMLLIElement) => {
      li.classList.remove("active");
    });
  }

  protected openFolder(popin: Popin, id?: number) {
    const container: HTMLElement = popin
      .getElement()
      .querySelector("#folder-tree");

    this.clearActiveFolder(popin);

    if (isNaN(id)) {
      id = null;
    }

    let link: HTMLAnchorElement;

    if (id) {
      link = container.querySelector('a[data-id="' + id.toString(10) + '"]');
    } else {
      link = container.querySelector(".root > li > a");
    }

    if (!link) {
      return;
    }

    const li: HTMLLIElement = link.closest("li");

    li.classList.add("active");

    this.query.folder = id;
    this.query.page = 1;

    this.load(popin);
  }

  protected initFolders(popin: Popin) {
    const container: HTMLElement = popin
      .getElement()
      .querySelector("#folder-tree");

    const unfold = (li: HTMLElement) => {
      if (li.classList.contains("open")) {
        li.classList.add("closed");
        li.classList.remove("open");
      } else {
        li.classList.remove("closed");
        li.classList.add("open");
      }

      this.savePreferences(popin);
    };

    const open = (id: number) => {
      this.openFolder(popin, id);
    };

    container.querySelectorAll("li").forEach((li: HTMLLIElement) => {
      const icon: HTMLElement = li.querySelector(".folder");
      const link: HTMLAnchorElement = li.querySelector("a:first-child");

      let folderId: number = parseInt(link.dataset.id, 10);

      if (link.dataset.id == "") {
        folderId = null;
      }

      link.addEventListener("contextmenu", (e: MouseEvent) => {
        e.preventDefault();

        if (folderId == null) {
          return;
        }

        this.openFolderContextual(popin, e, link);
      });

      link.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        open(parseInt(link.dataset.id, 10));
      });

      icon.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        unfold(li);
      });

      link.addEventListener("dragstart", (e: DragEvent) => {
        e.dataTransfer.setData("source", "media-manager");
        e.dataTransfer.setData("type", "folder");
        e.dataTransfer.setData("id", folderId.toString(10));
      });

      link.addEventListener("dragenter", (e: DragEvent) => {
        e.preventDefault();
        link.classList.add("drag");
      });

      link.addEventListener("dragleave", (e: DragEvent) => {
        link.classList.remove("drag");
      });

      link.addEventListener("dragover", (e: DragEvent) => {
        e.preventDefault();
        link.classList.add("drag");
        e.dataTransfer.dropEffect = "move";
      });

      link.addEventListener("drop", (e: DragEvent) => {
        e.preventDefault();
        link.classList.remove("drag");

        const source: string = e.dataTransfer.getData("source");
        const type: string = e.dataTransfer.getData("type");
        const id: string = e.dataTransfer.getData("id");
        const rawIds: string = e.dataTransfer.getData("ids");
        const partnerId: string = e.dataTransfer.getData("partnerId");

        if (source !== "media-manager") {
          return;
        }

        if (type === "image") {
          let ids: string[] = [];

          if (rawIds) {
            ids = JSON.parse(rawIds);
          }

          if (!ids.length && id) {
            ids.push(id);
          }

          if (!ids.length) {
            return;
          }

          this.getClient().get(
            "media",
            "move",
            {
              ids: ids,
              folderId: folderId,
            },
            (response: any) => {
              if (!response.success) {
                return;
              }

              const ids: string[] = response.moved;

              for (const id of ids) {
                this.removeMedia(popin, id);
              }
            }
          );
        }

        if (type === "folder") {
          const sourceId: number = parseInt(id, 10);

          if (sourceId == folderId) {
            return;
          }

          this.getClient().get(
            "media",
            "moveFolder",
            {
              id: sourceId,
              parentId: folderId,
            },
            (response) => {
              return this.loadFolders(popin);
            }
          );
        }
      });
    });
  }

  protected openFolderContextual(
    popin: Popin,
    e: MouseEvent,
    link: HTMLAnchorElement
  ) {
    const container: HTMLElement = document.getElementById("contextual");
    const name: string = link.textContent.trim();

    const html: string = Template.render("media/folder-contextual.html.njk", {
      left: e.pageX,
      top: e.pageY,
      name: name,
    });

    const closeMenu = () => {
      container.innerHTML = "";
    };

    container.innerHTML = html;

    const folderId: number = parseInt(link.dataset.id, 10);

    container.querySelectorAll("a").forEach((actionLink: HTMLAnchorElement) => {
      actionLink.addEventListener("mousedown", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const action: FolderAction = actionLink.dataset.action as FolderAction;
        const li: HTMLLIElement = link.closest("li");

        switch (action) {
          case FolderAction.CreateFolder:
            this.createFolder(popin, li);
            break;

          case FolderAction.Rename:
            this.renameFolder(popin, li);
            break;

          case FolderAction.Delete:
            this.deleteFolder(popin, folderId, link.textContent);
            break;

          case FolderAction.OrderDate:
            this.folderSort = FolderSort.Date;
            this.loadFolders(popin);
            break;

          case FolderAction.OrderName:
            this.folderSort = FolderSort.Name;
            this.loadFolders(popin);
            break;
        }

        closeMenu();
      });
    });
  }

  protected deleteFolder(popin: Popin, folderId: number, name: string) {
    if (
      confirm(
        this.__(
          'Do you really want to delete the "%{name}" folder? All media contained in this folder and its subfolders will be deleted.',
          { name: name }
        )
      )
    ) {
      this.getClient().get(
        "media",
        "deleteFolder",
        {
          id: folderId,
        },
        (response: any) => {
          this.query.folder = null;

          this.loadFolders(popin);
          this.load(popin);
        }
      );
    }
  }

  protected removeMedia(popin: Popin, id: string) {
    const container: HTMLElement = popin.getElement().querySelector("#medias");
    const media: HTMLElement = container.querySelector(
      '.media-entry[data-id="' + id + '"]'
    );

    if (!media) {
      return;
    }

    switch (this.displayMode) {
      case DisplayMode.Thumbnail:
        media.parentElement.remove();
        break;

      case DisplayMode.List:
        media.remove();
        break;
    }
  }

  protected initSearch(popin: Popin) {
    const form: HTMLFormElement = popin
      .getElement()
      .querySelector("#media-search");
    const input: HTMLInputElement = form.querySelector("#q");

    const search = () => {
      let val: string = input.value;
      val = val.trim();

      if (!val) {
        val = null;
      }

      this.query.q = val;
      this.query.page = 1;

      this.load(popin);
    };

    form.addEventListener("submit", (e: SubmitEvent) => {
      e.preventDefault();
      search();
    });

    input.addEventListener("change", (e: Event) => {
      search();
    });
  }

  protected initTypeFilter(popin: Popin) {
    const filter: HTMLSelectElement = popin.getElement().querySelector("#type");

    filter.addEventListener("change", (e) => {
      this.query.type = filter.value as MediaSearchType;

      if (this.query.type === MediaSearchType.All || !this.query.type) {
        delete this.query.type;
      }

      this.query.page = 1;

      this.load(popin);
    });
  }

  protected initDisplayMode(popin: Popin) {
    const selector: HTMLElement = popin
      .getElement()
      .querySelector(".view-selector");

    const unselect = () => {
      selector
        .querySelectorAll("a")
        .forEach((selectorLink: HTMLAnchorElement) => {
          selectorLink.classList.remove("active");
        });
    };

    selector
      .querySelectorAll("a")
      .forEach((selectorLink: HTMLAnchorElement) => {
        selectorLink.addEventListener("click", (e: MouseEvent) => {
          e.preventDefault();

          unselect();
          selectorLink.classList.add("active");

          this.displayMode = selectorLink.dataset.mode as DisplayMode;

          this.savePreferences(popin);
          this.renderDisplayMode(popin);
          this.query.page = 1;
          this.load(popin);
        });
      });

    const preferences: MediaManagerPreferences = this.getPreferences();

    if (!preferences.displayMode) {
      preferences.displayMode = DisplayMode.Thumbnail;
    }

    const activeElement: HTMLElement = selector.querySelector(
      'a[data-mode="' + preferences.displayMode + '"]'
    );

    if (activeElement) {
      unselect();
      activeElement.classList.add("active");
      this.displayMode = preferences.displayMode;
    }
  }

  protected validateFiles(input: HTMLInputElement): UploadError[] {
    const files: FileList = input.files;
    const length: number = files.length;
    const errors: UploadError[] = [];
    const validator: MediaValidation = new MediaValidation();

    for (let i = 0; i < length; i++) {
      const file: File = files.item(i);
      const status: MediaValidationStatus = validator.validate(
        file,
        MediaValidationScope.MediaManager
      );

      if (status.error) {
        errors.push({
          message: status.message,
          code: status.code,
        });
      }
    }

    return errors;
  }

  protected initErrors(popin: Popin) {
    const btn: HTMLAnchorElement = popin
      .getElement()
      .querySelector(".upload-errors a");
    const container: HTMLElement = popin
      .getElement()
      .querySelector(".upload-container");

    btn.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();

      container.classList.remove("has-error");
    });
  }

  protected resetUploadClass(popin: Popin) {
    const container: HTMLElement = popin
      .getElement()
      .querySelector(".upload-container");

    container.classList.remove("has-error");
    container.classList.remove("is-uploading");
  }

  protected setUploadClass(popin: Popin, status: string) {
    this.resetUploadClass(popin);

    const container: HTMLElement = popin
      .getElement()
      .querySelector(".upload-container");
    container.classList.add(status);
  }

  protected displayUploadErrors(popin: Popin, errors: UploadError[]) {
    const container: HTMLElement = popin
      .getElement()
      .querySelector(".upload-container");

    this.setUploadClass(popin, "has-error");

    container.querySelector(".error-messages").innerHTML = Template.render(
      "media/errors.html.njk",
      {
        errors: errors,
      }
    );
  }

  protected initUpload(popin: Popin) {
    const uploadElement: HTMLInputElement = popin
      .getElement()
      .querySelector("#upload");
    const form: HTMLFormElement = popin
      .getElement()
      .querySelector("#upload-form");

    uploadElement.addEventListener("change", (e: Event) => {
      const errors: UploadError[] = this.validateFiles(uploadElement);

      if (errors.length) {
        this.displayUploadErrors(popin, errors);
        return;
      }

      const formData: FormData = new FormData(form);

      this.processUpload(popin, formData);
    });

    const mediaContainer: HTMLElement = popin
      .getElement()
      .querySelector("#medias");

    mediaContainer.addEventListener("dragenter", (e: DragEvent) => {
      e.preventDefault();
    });

    mediaContainer.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
    });

    mediaContainer.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();

      if (e.dataTransfer.items || e.dataTransfer.files) {
        const files: File[] = [];

        if (e.dataTransfer.items) {
          [...e.dataTransfer.items].forEach((item, i) => {
            if (item.kind === "file") {
              const file = item.getAsFile();
              files.push(file);
            }
          });
        } else {
          [...e.dataTransfer.files].forEach((file, i) => {
            files.push(file);
          });
        }

        if (!files.length) {
          return;
        }

        const formData: FormData = new FormData();

        files.forEach((file: File) => {
          formData.append("media[]", file);
        });

        this.processUpload(popin, formData);
      }
    });
  }

  protected processUpload(popin: Popin, formData: FormData) {
    const url = window["configuration"]["cdnUrl"] + "/upload";
    this.setUploadClass(popin, "is-uploading");

    if (this.query.folder) {
      formData.append("folder_id", this.query.folder.toString(10));
    }

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
      xhr: () => {
        const xhr = new window.XMLHttpRequest();

        if (xhr.upload) {
          xhr.upload.addEventListener(
            "progress",
            (e: ProgressEvent) => {
              this.onProgressUpdate(popin, e);
            },
            false
          );
        }

        return xhr;
      },
      success: (data: any) => {
        this.resetUploadClass(popin);

        const medias: Media[] = JSON.parse(data);
        const html: string = this.renderMediasHTML(medias);

        this.render(popin, html, RenderMode.Before);
        this.reloadStorage(popin);
      },
      error: (jqXHR, textStatus, errorThrown) => {
        const error: UploadError = {
          message: this.__("An error occurred while sending your files."),
          code: jqXHR.status,
        };

        this.displayUploadErrors(popin, [error]);
      },
    });
  }

  protected onProgressUpdate(popin: Popin, e: ProgressEvent) {
    const progressBar: HTMLElement = popin
      .getElement()
      .querySelector("#upload-form .progress-bar");

    if (e.lengthComputable) {
      let percent: number = (e.loaded / e.total) * 100;

      if (percent > 100) {
        percent = 100;
      }

      progressBar.style.width = percent.toString(10) + "%";
    }
  }

  protected renderDisplayMode(popin: Popin) {
    popin.getElement().querySelector("#medias").innerHTML =
      this.getDisplayModeLayout();

    if (this.displayMode === DisplayMode.Thumbnail) {
      this.initThumbnailDisplayMode(popin);
    }

    if (this.displayMode === DisplayMode.List) {
      this.initListDisplayMode(popin);
    }
  }

  protected initListDisplayMode(popin: Popin) {
    const table: HTMLTableElement = popin
      .getElement()
      .querySelector("table.media-table-layout");

    table.querySelectorAll("th").forEach((th: HTMLTableCellElement) => {
      const type: MediaSearchSort = th.dataset.type as MediaSearchSort;

      th.addEventListener("click", (e: MouseEvent) => {
        if (this.query.sort === type) {
          if (this.query.sort_direction === MediaSearchSortDirection.Asc) {
            this.query.sort_direction = MediaSearchSortDirection.Desc;
          } else {
            this.query.sort_direction = MediaSearchSortDirection.Asc;
          }
        } else {
          this.query.sort = type;
          this.query.sort_direction = defaultSortDirection[type];
        }

        this.query.page = 1;

        this.load(popin);
      });
    });
  }

  protected updateSort(popin: Popin) {
    const table: HTMLTableElement = popin
      .getElement()
      .querySelector("table.media-table-layout");

    if (!table) {
      return;
    }

    table
      .querySelectorAll("th .sort span")
      .forEach((caret: HTMLSpanElement) => {
        caret.classList.remove("active");
      });

    const caret: HTMLSpanElement = table.querySelector(
      'span[data-sort="' +
        this.query.sort +
        '"][data-direction="' +
        this.query.sort_direction +
        '"]'
    );

    if (caret) {
      caret.classList.add("active");
    }
  }

  protected initThumbnailDisplayMode(popin: Popin) {
    const selector: HTMLElement = popin
      .getElement()
      .querySelector(".size-selector");

    const clearSteps = () => {
      selector.querySelectorAll(".step").forEach((step: HTMLElement) => {
        step.innerHTML = "";
      });
    };

    selector.querySelectorAll(".step").forEach((step: HTMLElement) => {
      step.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        clearSteps();

        const active: HTMLSpanElement = document.createElement("span");
        active.classList.add("active");

        step.append(active);

        const col: number = parseInt(step.dataset.col, 10);

        this.cols = col as ThumbCols;
        this.savePreferences(popin);
        this.updateColCount(popin);
      });
    });
  }

  protected getDisplayModeLayout() {
    let html = "";

    switch (this.displayMode) {
      case DisplayMode.List:
        html = Template.render("media/list-layout.html.njk");
        break;

      case DisplayMode.Thumbnail:
        html = Template.render("media/thumbs-layout.html.njk");
        break;
    }

    return html;
  }

  protected load(popin: Popin) {
    this.autoScrollEnabled = true;

    this.getClient().get(
      "media",
      "find",
      {
        query: this.query,
      },
      (response: any) => {
        const medias: Media[] = response.result.medias;
        const page: number = response.result.page;

        let html: string;

        if (medias.length == 0) {
          this.autoScrollEnabled = false;
        }

        if (medias.length == 0 && page == 1) {
          html = Template.render("media/empty.html.njk");
        } else {
          html = this.renderMediasHTML(medias);
        }

        if (page == 1) {
          this.render(popin, html, RenderMode.Replace);
        } else {
          this.render(popin, html, RenderMode.After);
        }

        this.autoScrollLoading = false;

        const reloadEvent: CustomEvent = new CustomEvent<any>("render");
        const container: HTMLElement = popin
          .getElement()
          .querySelector("#medias");

        container.dispatchEvent(reloadEvent);
      }
    );
  }

  protected render(popin: Popin, html: string, mode: RenderMode) {
    const container: HTMLElement = popin
      .getElement()
      .querySelector("#medias-container");

    switch (mode) {
      case RenderMode.Replace:
        container.innerHTML = html;
        break;

      case RenderMode.Before:
        container.insertAdjacentHTML("afterbegin", html);
        break;

      case RenderMode.After:
        container.insertAdjacentHTML("beforeend", html);
        break;
    }

    this.initMediaEntries(popin);
  }

  protected updateColCount(popin: Popin) {
    const preferences: MediaManagerPreferences = this.getPreferences();

    if (preferences.cols) {
      this.cols = preferences.cols;
    }

    const cols: ThumbCols = this.cols;
    const colType: number = Math.round(12 / cols);

    popin
      .getElement()
      .querySelectorAll("#medias-container > div")
      .forEach((col: HTMLElement) => {
        if (col.classList.contains("empty-medias")) {
          return;
        }

        col.classList.remove("col-12");
        col.classList.remove("col-6");
        col.classList.remove("col-4");
        col.classList.remove("col-3");
        col.classList.add("col-" + colType.toString(10));
      });

    const selector: HTMLElement = popin
      .getElement()
      .querySelector(".size-selector");

    selector.querySelectorAll(".step").forEach((step: HTMLElement) => {
      step.innerHTML = "";

      if (step.dataset.col == this.cols.toString(10)) {
        const active: HTMLSpanElement = document.createElement("span");
        active.classList.add("active");

        step.append(active);
      }
    });
  }

  protected initMediaEntries(popin: Popin) {
    if (this.displayMode === DisplayMode.Thumbnail) {
      this.updateColCount(popin);
    } else {
      this.updateSort(popin);
    }

    popin
      .getElement()
      .querySelectorAll(".media-entry")
      .forEach((entry: HTMLElement) => {
        if (entry.classList.contains("initialized")) {
          return;
        }

        this.initMediaEntry(popin, entry);
      });
  }

  protected openMediaContextual(
    popin: Popin,
    entry: HTMLElement,
    e: MouseEvent,
    mode: ImageDropMode = ImageDropMode.Normal
  ) {
    const container: HTMLElement = document.getElementById("contextual");

    let templatePath = "media/media-contextual.html.njk";
    let isMultiple = false;

    const checkboxes = popin
      .getElement()
      .querySelectorAll('#medias input[type="checkbox"]:checked');

    if (checkboxes.length > 0) {
      templatePath = "media/media-multiple-contextual.html.njk";
      isMultiple = true;
    }

    if (mode === ImageDropMode.Unlocked) {
      templatePath = "media/unlocked-media-contextual.html.njk";
    }

    const html: string = Template.render(templatePath, {
      left: e.pageX,
      top: e.pageY,
      count: checkboxes.length,
      type: entry.dataset.type,
    });

    container.innerHTML = html;

    const closeMenu = () => {
      container.innerHTML = "";
    };

    container.querySelectorAll("a").forEach((actionLink: HTMLAnchorElement) => {
      actionLink.addEventListener("mousedown", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const action: MediaAction = actionLink.dataset.action as MediaAction;
        let id: string = entry.dataset.id;

        if (mode === ImageDropMode.Unlocked) {
          id = entry.dataset.unlockedId;
        }

        switch (action) {
          case MediaAction.Rename: {
            this.renameMedia(popin, entry);
            break;
          }

          case MediaAction.Delete: {
            if (isMultiple) {
              this.deleteSelection(popin);
            } else {
              this.deleteMedia(id);
            }
            break;
          }

          case MediaAction.AddToScene: {
            this.addMediaToScene(id, mode);
            break;
          }

          case MediaAction.CreateScene: {
            this.createScene(id, mode);
            break;
          }

          case MediaAction.CreateJournal: {
            const title: string = entry
              .querySelector(".name-container")
              .textContent.trim();
            const url: string = entry.dataset.url;

            this.createJournalEntry(id, url, title);
            break;
          }
        }

        closeMenu();
      });
    });
  }

  protected createJournalEntry(id: string, url: string, title: string) {
    this.getClient().get(
      "journal",
      "create",
      {
        mediaUrl: url,
      },
      (response) => {
        return this.getJournalView().openPage({
          id: response.id,
          title: title,
          edit: true,
        });
      }
    );
  }

  protected createScene(id: string, mode: ImageDropMode) {
    const data: any = {};

    if (mode === ImageDropMode.Normal) {
      data.id = id;
    } else {
      data.unlockedId = parseInt(id, 10);
    }

    this.getClient().send("scene", "createFromImage", data);
  }

  protected addMediaToScene(id: string, mode: ImageDropMode) {
    const state: SceneState = this.getSceneState();

    const data: any = {
      x: 0,
      y: 0,
      scene: state.id,
      layer: state.layerKey,
      centered: true,
    };

    if (mode === ImageDropMode.Normal) {
      data.id = id;
    } else {
      data.unlockedId = parseInt(id, 10);
    }

    this.getClient().get("scene", "addImage", data, (response) => {
      return;
    });
  }

  protected getMediaType(mime: string): string {
    let type = "image";

    switch (mime) {
      case "video/webm":
      case "video/mp4":
      case "video/m4v":
        type = "video";
        break;
    }

    return type;
  }

  public openMedia(id: string) {
    this.getClient().get(
      "media",
      "load",
      {
        id: id,
      },
      (response: any) => {
        const media: any = response.media;
        const name: string = media.title ?? media.filename;
        const type: string = this.getMediaType(media.mime);

        const popin: Popin = this.getPopinManager().create({
          id: "view-media-" + media.id,
          title: name,
          html: Template.render("media/media.html.njk", {
            media: media,
            name: name,
            type: type,
          }),
          canMinimize: false,
          canDock: false,
          icon: "fas fa-photo-video",
        });

        popin.on("init", () => {
          popin.getElement().classList.add("media-view");

          const titleInput: HTMLInputElement = popin
            .getElement()
            .querySelector('[name="media-title"]');
          const tagsInput: HTMLInputElement = popin
            .getElement()
            .querySelector('[name="media-tags"]');

          const save = () => {
            const newName: string = titleInput.value.trim();

            this.getClient().get(
              "media",
              "update",
              {
                title: newName,
                tags: tagsInput.value,
                id: media.id,
              },
              (response) => {
                const mediaManager: Popin =
                  this.getPopinManager().get("media-manager");

                if (!mediaManager) {
                  return;
                }

                const entry: HTMLElement = mediaManager
                  .getElement()
                  .querySelector('.media-entry[data-id="' + media.id + '"]');

                if (entry) {
                  entry.querySelector(".name-container").textContent = newName;
                }
              }
            );
          };

          titleInput.addEventListener("change", (e: Event) => {
            save();
          });

          tagsInput.addEventListener("change", (e: Event) => {
            save();
          });

          popin
            .getElement()
            .querySelectorAll("a")
            .forEach((link: HTMLAnchorElement) => {
              if (!link.dataset.action) {
                return;
              }

              link.addEventListener("click", (e: MouseEvent) => {
                const action: MediaAction = link.dataset.action as MediaAction;

                switch (action) {
                  case MediaAction.AddToScene: {
                    this.addMediaToScene(media.id, ImageDropMode.Normal);
                    break;
                  }

                  case MediaAction.CreateScene: {
                    this.createScene(media.id, ImageDropMode.Normal);
                    break;
                  }

                  case MediaAction.CreateJournal: {
                    const name: string = media.title ?? media.filename;
                    const url: string =
                      window["configuration"]["cdnReadUrl"] + "/" + media.path;

                    this.createJournalEntry(media.id, url, name);
                    break;
                  }

                  case MediaAction.Delete: {
                    if (confirm(this.__("Delete this media?"))) {
                      this.deleteMedia(media.id);
                      popin.close();
                    }
                    break;
                  }
                }
              });
            });
        });

        popin.open();
      }
    );
  }

  protected deleteMedia(id: string) {
    this.getClient().send("media", "delete", {
      id: id,
    });

    const popin = this.getPopinManager().get("media-manager");

    if (popin) {
      this.removeMedia(popin, id);
    }
  }

  protected deleteSelection(popin: Popin) {
    const checkboxes = popin
      .getElement()
      .querySelectorAll('#medias input[type="checkbox"]:checked');
    const ids: string[] = [];

    checkboxes.forEach((checkbox: HTMLInputElement) => {
      const entry: HTMLElement = checkbox.closest(".media-entry");

      if (!entry) {
        return;
      }

      const id: string = entry.dataset.id;

      if (!id) {
        return;
      }

      ids.push(id);
    });

    if (!ids.length) {
      return;
    }

    this.getClient().get(
      "media",
      "multiDelete",
      {
        ids: ids,
      },
      (response) => {
        for (const id of ids) {
          this.removeMedia(popin, id);
        }
      }
    );
  }

  protected initMediaEntry(popin: Popin, entry: HTMLElement) {
    entry.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();

      this.openMediaContextual(popin, entry, e, ImageDropMode.Normal);
    });

    entry.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();

      if (this.onPick !== null) {
        this.onPick(entry.dataset.id, entry.dataset.url);
        popin.close(true);
      } else {
        this.openMedia(entry.dataset.id);
      }
    });

    entry.querySelector("input").addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
    });

    this.initMediaEntryDragAndDrop(popin, entry);

    entry.classList.add("initialized");
  }

  protected initMediaEntryDragAndDrop(popin: Popin, entry: HTMLElement) {
    entry.addEventListener("dragstart", (e: DragEvent) => {
      const id: string = entry.dataset.id.toString();

      e.dataTransfer.setData("source", "media-manager");
      e.dataTransfer.setData("type", "image");

      if (entry.dataset.partnerId) {
        e.dataTransfer.setData("partnerId", entry.dataset.partnerId.toString());
      } else if (entry.dataset.unlockedId) {
        e.dataTransfer.setData(
          "unlockedId",
          entry.dataset.unlockedId.toString()
        );
      } else {
        e.dataTransfer.setData("id", id);
      }

      if (this.tab === MediaTab.My) {
        const container: HTMLElement = popin
          .getElement()
          .querySelector("#medias");
        const ids: string[] = [];

        container
          .querySelectorAll("input:checked")
          .forEach((input: HTMLInputElement) => {
            const media: HTMLElement = input.closest("div.media-entry");

            if (!media) {
              return;
            }

            ids.push(media.dataset.id);
          });

        if (ids.length) {
          e.dataTransfer.setData("ids", JSON.stringify(ids));
        }
      }
    });
  }

  protected renderMediasHTML(medias: Media[]): string {
    let html = "";

    switch (this.displayMode) {
      case DisplayMode.List:
        html = Template.render("media/list.html.njk", {
          medias: medias,
          get_icon: this.getMediaIcon,
        });
        break;

      case DisplayMode.Thumbnail:
        html = Template.render("media/thumbs.html.njk", {
          medias: medias,
          get_icon: this.getMediaIcon,
        });
        break;
    }

    return html;
  }

  protected getMediaIcon(media: Media): string {
    if (media.is_token) {
      return "fas fa-user-circle";
    }

    if (media.is_avatar) {
      return "fas fa-file-user";
    }

    if (media.type === "image" || media.type === "animated") {
      return "fas fa-image";
    }

    if (media.type === "video") {
      return "fas fa-video";
    }

    return "fas fa-question-circle";
  }

  protected savePreferences(popin: Popin) {
    const preferences: MediaManagerPreferences = {};

    preferences.displayMode = this.displayMode;
    preferences.sort = this.query.sort;
    preferences.sortDirection = this.query.sort_direction;
    preferences.cols = this.cols;

    const folders: FolderStatuses = {};
    const tree: HTMLElement = popin.getElement().querySelector("#folder-tree");

    tree.querySelectorAll("li.open").forEach((li: HTMLLIElement) => {
      const a: HTMLAnchorElement = li.firstElementChild as HTMLAnchorElement;

      if (!a.dataset.id) {
        return;
      }

      const id: number = parseInt(a.dataset.id, 10);

      folders[id] = {
        open: true,
      };
    });

    preferences.folders = folders;

    localStorage.setItem(
      MediaView.PreferenceStorageKey,
      JSON.stringify(preferences)
    );
  }

  protected getPreferences(): MediaManagerPreferences {
    const raw = localStorage.getItem(MediaView.PreferenceStorageKey);

    if (!raw) {
      return {};
    }

    return JSON.parse(raw);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }

  protected getJournalView(): JournalView {
    return container.get<JournalView>(Views.Encyclopedia);
  }
}

interface MediaManagerPreferences {
  displayMode?: DisplayMode;
  sort?: MediaSearchSort;
  sortDirection?: MediaSearchSortDirection;
  folders?: FolderStatuses;
  cols?: ThumbCols;
}

interface FolderStatuses {
  [id: number]: {
    open: boolean;
  };
}

export interface MediaQuery {
  q?: string;
  type?: MediaSearchType;
  folder?: number;
  page?: number;
  sort?: MediaSearchSort;
  sort_direction?: MediaSearchSortDirection;
}

export interface MediaType {
  type: string;
  label: string;
}

export enum DisplayMode {
  List = "list",
  Thumbnail = "thumbnail",
}

export const defaultSortDirection = {
  [MediaSearchSort.Name]: MediaSearchSortDirection.Asc,
  [MediaSearchSort.Date]: MediaSearchSortDirection.Desc,
  [MediaSearchSort.Size]: MediaSearchSortDirection.Desc,
};

interface UploadError {
  message: string;
  code: number;
}

type ThumbCols = 1 | 2 | 3 | 4;

enum RenderMode {
  Replace,
  Before,
  After,
}

enum FolderAction {
  CreateFolder = "create-folder",
  Rename = "rename",
  Delete = "delete",
  OrderDate = "order-date",
  OrderName = "order-name",
}

enum MediaAction {
  Rename = "rename",
  Delete = "delete",
  AddToScene = "add-scene",
  CreateScene = "create-scene",
  CreateJournal = "create-journal",
}

enum MediaTab {
  My,
  Unlocked,
  Partner,
}
