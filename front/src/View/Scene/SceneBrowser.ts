import { injectable } from "inversify";
import { Popin } from "../Popin/Popin";
import { Template } from "../Template";
import { PopinManager } from "../Popin/PopinManager";
import { container } from "../../DependencyInjection/Container";
import { Services } from "../../DependencyInjection/Services";
import { View } from "../View";
import { GmView } from "../GmView";
import { Views } from "../../DependencyInjection/Views";
import { Media } from "../../../shared/Media";
import { ScenePack } from "../../../shared/Scene/ScenePack";

@injectable()
export class SceneBrowserView extends View {
  public open(): Popin {
    const popin: Popin = this.getPopinManager().create({
      id: "scene-explorer",
      title: this.__("Scene Explorer"),
      html: Template.render("gm/scene/explorer-container.html.njk"),
      canDock: false,
      canMinimize: false,
      width: 730,
      height: 650,
      minHeight: 400,
      forceHeight: true,
      icon: "fas fa-mountains",
    });

    popin.on("init", () => {
      return this.initPopin(popin);
    });

    popin.open();

    return popin;
  }

  protected async initPopin(popin: Popin): Promise<Popin> {
    const tabsContainer: HTMLElement = popin
      .getElement()
      .querySelector(".scene-browser .tabs");

    const tabs: NodeListOf<HTMLAnchorElement> =
      tabsContainer.querySelectorAll("a.tab");

    const panels: NodeListOf<HTMLElement> = popin
      .getElement()
      .querySelectorAll(".tab-content");

    const activateTab = (tab: BrowserTab) => {
      tabs.forEach((tab: HTMLAnchorElement) => {
        tab.classList.remove("active");
      });

      let activePanel: HTMLElement;

      panels.forEach((panel: HTMLElement) => {
        panel.classList.add("d-none");

        if (panel.classList.contains(`${tab}-tab`)) {
          activePanel = panel;
        }
      });

      const activeTab: HTMLAnchorElement = tabsContainer.querySelector(
        `a[data-tab="${tab}"]`
      );
      activeTab.classList.add("active");

      if (activePanel) {
        activePanel.classList.remove("d-none");
      }
    };

    const openTab = (tab: BrowserTab) => {
      activateTab(tab);

      switch (tab) {
        case BrowserTab.Own:
          this.initOwn(popin);
          break;

        case BrowserTab.Unlocked:
          this.initUnlocked(popin);
          break;
      }
    };

    tabs.forEach((tab: HTMLAnchorElement) => {
      tab.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        const activeTab: BrowserTab = tab.dataset.tab as BrowserTab;
        openTab(activeTab);
      });
    });

    openTab(BrowserTab.Own);

    return Promise.resolve(popin);
  }

  protected async importSceneFile(data: any, filename: string, popin: Popin) {
    let image: string = data.image as string;

    if (!image.startsWith("data:")) {
      image = "data:image/jpeg;base64," + image;
    }

    const parts: string[] = filename.split(".");
    parts.pop();
    let mapName = parts.join(".").substring(0, 32).trim();

    if (!mapName) {
      mapName = "Imported scene";
    }

    const DataURIToBlob = (dataURI: string): Blob => {
      const splitDataURI: string[] = dataURI.split(",");
      const byteString: string =
        splitDataURI[0].indexOf("base64") >= 0
          ? atob(splitDataURI[1])
          : decodeURI(splitDataURI[1]);
      const mimeString: string = splitDataURI[0].split(":")[1].split(";")[0];

      const ia: Uint8Array = new Uint8Array(byteString.length);

      for (let i = 0; i < byteString.length; i++)
        ia[i] = byteString.charCodeAt(i);

      return new Blob([ia], { type: mimeString });
    };

    const file: Blob = DataURIToBlob(image);
    const formData = new FormData();
    formData.append("media[]", file, "imported-map.jpg");

    const url = window["configuration"]["cdnUrl"] + "/upload";
    const progressContainer: HTMLElement = popin
      .getElement()
      .querySelector("#import-progress");

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
      xhr: function () {
        const myXhr = $.ajaxSettings.xhr();

        if (myXhr.upload) {
          progressContainer.classList.remove("d-none");

          myXhr.upload.addEventListener(
            "progress",
            function (e) {
              if (e.lengthComputable) {
                const percent: number = (e.loaded / e.total) * 100;
                progressContainer.innerText = percent.toString() + "%";
              }
            },
            false
          );
        }

        return myXhr;
      },
    }).done((res) => {
      const response = JSON.parse(res);
      const cdnImage: Media = response[0];

      data.image = {
        url: cdnImage.path,
        id: cdnImage.id,
        filename: cdnImage.filename,
      };

      progressContainer.innerText = this.__("Importing...");

      this.getClient().send("scene", "importScene", {
        map: data,
        name: mapName,
      });
    });
  }

  protected async initUnlocked(popin: Popin): Promise<Popin> {
    const sidebar: HTMLElement = popin
      .getElement()
      .querySelector(".unlocked-tab #unlocked-packs");

    const scenesContainer: HTMLElement = popin
      .getElement()
      .querySelector(".unlocked-scenes");

    this.getClient().get("scene", "packs", {}, (response: PackResponse) => {
      sidebar.innerHTML = Template.render("gm/scene/unlocked-packs.html.njk", {
        packs: response.packs,
      });

      const unselect = () => {
        sidebar.querySelectorAll(".scene-pack").forEach((pack: HTMLElement) => {
          pack.classList.remove("active");
        });
      };

      sidebar.querySelectorAll(".scene-pack").forEach((pack: HTMLElement) => {
        pack.addEventListener("click", (e: MouseEvent) => {
          e.preventDefault();

          unselect();
          pack.classList.add("active");

          const id: number = parseInt(pack.dataset.id, 10);

          this.loadPack(id, popin);
        });
      });
    });

    return popin;
  }

  protected async loadPack(id: number, popin: Popin) {
    const scenesContainer: HTMLElement = popin
      .getElement()
      .querySelector(".unlocked-scenes");

    this.getClient().get(
      "scene",
      "loadPackScenes",
      {
        id: id,
      },
      (response: LoadPackResponse) => {
        renderPack(response.pack);
      }
    );

    const renderPack = (pack: ScenePack) => {
      scenesContainer.innerHTML = Template.render(
        "gm/scene/unlocked-scenes.html.njk",
        {
          scenes: pack.scenes,
          pack: pack,
        }
      );

      scenesContainer
        .querySelectorAll(".scene-entry")
        .forEach((entry: HTMLElement) => {
          entry.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            const id: number = parseInt(entry.dataset.id, 10);

            console.log(id);

            this.getClient().send("scene", "createFromPack", {
              id: id,
            });

            popin.close(true);
          });
        });
    };
  }

  protected async initOwn(popin: Popin): Promise<Popin> {
    let inArchives = false;
    let q: string = null;

    const load = () => {
      this.getClient().get(
        "scene",
        "gallery",
        {
          archives: inArchives,
          q: q,
        },
        (response) => {
          popin.getElement().querySelector(".scene-explorer").innerHTML =
            Template.render("gm/scene/explorer.html.njk", {
              scenes: response.scenes,
              current: {
                dm: response.dmSceneId,
                player: response.playerSceneId,
              },
              cdnUrl: window["configuration"]["cdnReadUrl"],
              rnd: (Math.random() * 100000).toString(),
            });

          popin.getjQueryElement().find(".loaders a").tooltip({
            placement: "bottom",
            trigger: "hover",
          });

          this.initDelete(popin);
          this.initArchive(popin, () => load());
          this.initLoad(popin);
          this.initCreateScene(popin);
          this.initImportScene(popin);
        }
      );
    };

    let searchTimeout;

    const select: HTMLSelectElement = popin
      .getElement()
      .querySelector(".category select");

    const search: HTMLInputElement = popin
      .getElement()
      .querySelector(".search input");

    select.addEventListener("change", () => {
      inArchives = select.value !== "active";
      load();
    });

    search.addEventListener("keyup", () => {
      clearTimeout(searchTimeout);

      searchTimeout = setTimeout(() => {
        q = search.value;
        q = q.trim();

        if (q == "") {
          q = null;
        }

        load();
      }, 350);
    });

    load();

    return Promise.resolve(popin);
  }

  protected initDelete(popin: Popin): Popin {
    popin
      .getElement()
      .querySelectorAll(".action-delete")
      .forEach((link: HTMLAnchorElement) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();

          if (
            confirm(this.__("Are you sure you want to delete this scene ?"))
          ) {
            const id: number = parseInt(link.dataset.id, 10);
            const container: Element = link.closest(".scene-box");

            $(container).fadeOut(300, () => {
              container.remove();
            });

            this.getClient().send("scene", "delete", {
              id: id,
            });
          }
        });
      });

    return popin;
  }

  protected initArchive(popin: Popin, onArchive: Function): Popin {
    popin
      .getElement()
      .querySelectorAll(".action-archive, .action-restore")
      .forEach((link: HTMLAnchorElement) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();

          const id: number = parseInt(link.dataset.id, 10);
          let action = "archive";

          if (link.classList.contains("action-restore")) {
            action = "restore";
          }

          this.getClient().get(
            "scene",
            action,
            {
              scene: id,
            },
            onArchive
          );
        });
      });

    return popin;
  }

  protected initLoad(popin: Popin): Popin {
    popin
      .getElement()
      .querySelectorAll(".action-load")
      .forEach((link: HTMLAnchorElement) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();

          popin.getjQueryElement().find(".loaders a").tooltip("dispose");

          const id: number = parseInt(link.dataset.id, 10);

          this.getGmView().updateSceneThumbnail();

          this.getClient().send("scene", "load", {
            scene: id,
            toAll: link.classList.contains("player-btn"),
          });

          popin.close();
        });
      });

    return popin;
  }

  protected initCreateScene(popin: Popin): Popin {
    popin
      .getElement()
      .querySelector(".create-scene-btn")
      .addEventListener("click", (e) => {
        e.preventDefault();
        this.getGmView().createScene();
        popin.close();
      });

    return popin;
  }

  protected initImportScene(popin: Popin): Popin {
    popin
      .getElement()
      .querySelector("#import-scene-upload")
      .addEventListener(
        "change",
        (e: Event) => {
          const files: FileList = (e.target as HTMLInputElement).files;
          const file: File = files[0];

          const reader: FileReader = new FileReader();

          reader.onload = (event: ProgressEvent<FileReader>) => {
            let text: string = event.target.result.toString();
            text = text.replaceAll('":NaN', '":0');
            let data: DD2VTT;

            try {
              data = JSON.parse(text);
            } catch (e) {
              console.log(e);
              alert("Unable to read Universal VTT format");
              return;
            }

            return this.importSceneFile(data, file.name, popin);
          };

          reader.readAsText(file);
        },
        false
      );

    return popin;
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getGmView(): GmView {
    return container.get<GmView>(Views.Gm);
  }
}

interface PackResponse {
  packs: Partial<ScenePack>[];
}

interface LoadPackResponse {
  pack: ScenePack;
}

interface DD2VTT {
  image: string | unknown;
  [properties: string]: unknown;
}

enum BrowserTab {
  Own = "own",
  Unlocked = "unlocked",
}
