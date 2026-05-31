import { View } from "./View";
import { injectable } from "inversify";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { SceneImage } from "../Engine/SceneImage";
import { Stage } from "../Engine/Stage";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { Template } from "./Template";
import Konva from "konva";
import { PopinManager } from "./Popin/PopinManager";
import { Popin } from "./Popin/Popin";
import {
  CraftItem,
  TokenAura,
  TokenAuraColors,
  TokenAuraIcon,
  TokenBar,
  TokenBarColors,
  TokenBars,
  TokenBarType,
  TokenItem,
} from "../../shared/Scene/SceneData";
import { SceneState } from "../State/SceneState";
import { States } from "../DependencyInjection/State";
import { Scene } from "../Entity/Scene";
import { CodeExecutor } from "../../shared/System/CodeExecutor";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { CharacterRepository } from "../Repository/CharacterRepository";
import { Repository } from "../DependencyInjection/Repository";
import { TokenEmitter } from "../Emitter/TokenEmitter";
import { Emitters } from "../DependencyInjection/Emitters";
import $ = require("jquery");
import { CraftRepository } from "../Repository/CraftRepository";
import { CharacterView } from "./CharacterView";
import { Views } from "../DependencyInjection/Views";
import { CraftView } from "./CraftView";
import { IconPack } from "../../shared/IconPackData";

@injectable()
export class TokenView extends View {
  protected container: HTMLElement;
  protected menu: HTMLElement;
  protected barEdit: HTMLElement;
  protected selected: SceneImage = null;
  protected selectedBarImage: SceneImage = null;
  protected selectedBar: string = null;

  public init() {
    super.init();

    const menuHtml: string = Template.render("token/hamburger-menu.html.njk");
    const barEditHtml: string = Template.render("token/edit-bar.html.njk");

    this.container = document.getElementById("token-action-container");
    this.container.insertAdjacentHTML("afterbegin", menuHtml);
    this.container.insertAdjacentHTML("afterbegin", barEditHtml);
    this.menu = this.container.querySelector("#token-menu");
    this.barEdit = this.container.querySelector("#token-edit-bar");

    this.barEdit.querySelector("input").addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        this.unselect();
      }
    });
    this.barEdit.querySelector("input").addEventListener("blur", (e) => {
      this.unselect();
    });

    this.unselect();

    EventDispatcher.on(Events.SCENE_ITEM_BAR_VALUE, (e) => {
      this.enableEditBarValue(e.item, e.bar, e.offset);
    });

    EventDispatcher.on(Events.TOKEN_OPEN_AURA, (e) => {
      this.openExtraPopin(e.item, "aura");
    });

    EventDispatcher.on(Events.TOKEN_OPEN_BARS, (e) => {
      this.openExtraPopin(e.item, "bars");
    });

    EventDispatcher.on(Events.CHARACTER_COLOR_CHANGED, (e) => {
      this.onColorChange(e.cid, e.color);
    });
  }

  public onColorChange(cid: number, color: string) {
    const scene: Scene = this.getStage().getBoard().scene;

    scene.findCharacterTokens(cid).forEach((token: TokenItem) => {
      if (token.node) {
        (token.node as SceneImage).updateColor(color);
      }
    });
  }

  protected openExtraPopin(image: SceneImage, tab: string = null) {
    const item: TokenItem = image.item as TokenItem;
    const key: string = item.key;
    let sheet: CharacterSheet;
    let isCraft = false;

    const html: string = Template.render("token/extra-selector.html.njk", {
      item: item,
      key: key,
      html: {
        aura: Template.render("token/aura-selector.html.njk", {
          colors: TokenAuraColors,
        }),
        bars: Template.render("token/bar-selector.html.njk", {
          colors: TokenBarColors,
        }),
      },
    });

    const popin: Popin = this.getPopinManager().create({
      id: "token-extra-" + key,
      title: this.__("Token configuration"),
      html: html,
      canDock: false,
      canMinimize: false,
    });

    if (!item.bars) {
      item.bars = {
        bar1: {
          connected: false,
          connectedId: null,
          connectedValue: null,
          connectedMax: null,
          max: null,
          value: null,
          color: "#a81e14",
          enabled: false,
          maxType: TokenBarType.Custom,
          shared: false,
          valueType: TokenBarType.Custom,
        },
        bar2: {
          connected: false,
          connectedId: null,
          connectedValue: null,
          connectedMax: null,
          max: null,
          value: null,
          color: "#149694",
          enabled: false,
          maxType: TokenBarType.Custom,
          shared: false,
          valueType: TokenBarType.Custom,
        },
      };
    }

    popin.on("init", () => {
      const textInput: HTMLInputElement = popin
        .getElement()
        .querySelector(".aura-text");
      const colorItems = popin.getElement().querySelectorAll(".color-item");
      const shareStatusInput: HTMLInputElement = popin
        .getElement()
        .querySelector("#not-share-status");

      const iconContainer: HTMLElement = popin
        .getElement()
        .querySelector("#icon-selector");
      const listContainer: HTMLElement =
        iconContainer.querySelector("#icons-container");
      const packSelector: HTMLSelectElement =
        iconContainer.querySelector("#pack-selector");
      const selectedIconsContainer: HTMLElement =
        iconContainer.querySelector("#selected-icons");

      const icons: TokenAuraIcon[] = [];

      this.getClient().get("quickbar", "iconPacks", {}, (response: any) => {
        const packs: IconPack[] = response.packs;

        const option: HTMLOptionElement = document.createElement("option");
        option.value = "0";
        option.innerText = this.__("Choose icons pack");

        packSelector.append(option);

        for (const pack of packs) {
          const option: HTMLOptionElement = document.createElement("option");
          option.value = pack.id.toString(10);
          option.innerText = pack.name;

          packSelector.append(option);
        }

        iconContainer.classList.remove("d-none");
      });

      packSelector.addEventListener("change", (e) => {
        listContainer.innerText = this.__("Loading...");

        this.getClient().get(
          "quickbar",
          "loadIconPack",
          {
            id: packSelector.value,
          },
          (response: any) => {
            const pack: IconPack = response.pack;

            listContainer.innerHTML = Template.render(
              "quickbar/icon-list.html.njk",
              {
                pack: pack,
              }
            );

            listContainer
              .querySelectorAll(".icon")
              .forEach((icon: HTMLAnchorElement) => {
                icon.addEventListener("click", (e) => {
                  e.preventDefault();

                  addSelectedIcon(icon.dataset.pack, icon.dataset.path);
                });
              });
          }
        );
      });

      const addSelectedIcon = (pack: string, path: string) => {
        $(selectedIconsContainer)
          .find('[data-toggle="tooltip"]')
          .tooltip("hide");

        if (icons.length >= 5) {
          return;
        }

        let idx: number = icons.push({
          pack: pack,
          path: path,
        });

        idx -= 1;

        const img: HTMLImageElement = document.createElement("img");
        img.src = window["configuration"].cdnReadUrl + "/" + path;

        const link: HTMLAnchorElement = document.createElement("a");
        link.href = "#";
        link.classList.add("selected-icon");
        link.title = this.__("Remove icon");
        link.dataset.toggle = "tooltip";

        link.append(img);

        link.addEventListener("click", (e: MouseEvent) => {
          e.preventDefault();

          $(link).tooltip("dispose");
          link.remove();

          icons.splice(idx, 1);
        });

        selectedIconsContainer.append(link);

        $(selectedIconsContainer).find('[data-toggle="tooltip"]').tooltip();
      };

      const isBarConnected: boolean[] = [
        item.bars.bar1.connected,
        item.bars.bar2.connected,
      ];
      const barConnectedTo: string[][] = [
        [item.bars.bar1.connectedValue, item.bars.bar1.connectedMax],
        [item.bars.bar2.connectedValue, item.bars.bar2.connectedMax],
      ];
      const barConnectedIds: string[] = [
        item.bars.bar1.connectedId,
        item.bars.bar2.connectedId,
      ];

      const initConnected = () => {
        const attributes = this.getCodeExecutor().getBarAttributes(sheet);

        if (!attributes) {
          return;
        }

        if (Object.keys(attributes).length === 0) {
          return;
        }

        for (let i = 1; i <= 2; i++) {
          const index: string = i.toString(10);

          popin
            .getElement()
            .querySelector(".connect-" + index + "-group")
            .classList.remove("d-none");
          const attributeSelect: HTMLSelectElement = popin
            .getElement()
            .querySelector(".connect-" + index + "-select");
          const manualGroup: HTMLElement = popin
            .getElement()
            .querySelector(".manual-" + index + "-group");

          for (const name in attributes) {
            const option: HTMLOptionElement = document.createElement("option");
            option.value = name;
            option.text = name;

            attributeSelect.append(option);
          }

          attributeSelect.addEventListener("change", (e) => {
            if (attributeSelect.value == "") {
              manualGroup.classList.remove("d-none");
              isBarConnected[i] = false;
              return;
            }

            manualGroup.classList.add("d-none");
            isBarConnected[i] = true;
            barConnectedTo[i] = attributes[attributeSelect.value];
            barConnectedIds[i] = attributeSelect.value;
          });

          if (item.bars["bar" + index].connected) {
            attributeSelect.value = item.bars["bar" + index].connectedId;
            attributeSelect.dispatchEvent(new Event("change"));
          }
        }
      };

      if (item.character) {
        this.getCharacterRepository()
          .get(item.character.id)
          .then((_sheet: CharacterSheet) => {
            sheet = _sheet;
            this.getCharacterView().display(sheet, true);

            initConnected();
          });
      } else if (item["craft"]) {
        isCraft = true;

        this.getCraftRepository()
          .find(item["craft"].id)
          .then((craft: any) => {
            this.getCraftRepository().attachSheet(craft);
            sheet = craft.sheet;

            this.getCraftView().open(
              item["craft"].id,
              image.item as CraftItem,
              true
            );

            initConnected();
          });
      }

      let color = null;

      if (item.aura && item.aura.text) {
        textInput.value = item.aura.text;
      }

      shareStatusInput.checked = item.aura && item.aura.shared === false;

      if (item.aura && item.aura.icons) {
        for (const icon of item.aura.icons) {
          addSelectedIcon(icon.pack, icon.path);
        }
      }

      const unselectColors = () => {
        colorItems.forEach((colorItem: HTMLAnchorElement) => {
          colorItem.classList.remove("selected");
        });
      };

      colorItems.forEach((colorItem: HTMLAnchorElement) => {
        colorItem.addEventListener("click", (e) => {
          e.preventDefault();

          unselectColors();
          colorItem.classList.add("selected");

          color = colorItem.dataset.color;
        });
      });

      let selectedItem: HTMLAnchorElement;

      if (item.aura && item.aura.color) {
        selectedItem = popin
          .getElement()
          .querySelector('.color-item[data-color="' + item.aura.color + '"]');
      }

      if (!selectedItem) {
        selectedItem = colorItems.item(0) as HTMLAnchorElement;
      }

      selectedItem.dispatchEvent(new Event("click"));

      const bars = ["1", "2"];
      const elt: HTMLElement = popin.getElement();

      let bar1Color: string = TokenBarColors[0];
      let bar2Color: string = TokenBarColors[1];

      if (item.bars) {
        bars.forEach((bar: string) => {
          if (!item.bars["bar" + bar]) {
            return;
          }

          const b: TokenBar = item.bars["bar" + bar];
          (
            elt.querySelector("#enabled-bar-" + bar) as HTMLInputElement
          ).checked = b.enabled;
          (elt.querySelector("#share-bar-" + bar) as HTMLInputElement).checked =
            b.shared;
          (
            elt.querySelector(
              ".bar-" + bar + "-value-type"
            ) as HTMLSelectElement
          ).value = b.valueType;
          (
            elt.querySelector(
              ".bar-" + bar + "-value-custom"
            ) as HTMLInputElement
          ).value = b.value;
          (
            elt.querySelector(".bar-" + bar + "-max-type") as HTMLSelectElement
          ).value = b.maxType;
          (
            elt.querySelector(".bar-" + bar + "-max-custom") as HTMLInputElement
          ).value = b.max;
          elt
            .querySelector(
              ".bar" + bar + '-color[data-color="' + b.color + '"]'
            )
            .classList.add("active");

          if (bar == "1") {
            bar1Color = b.color;
          } else {
            bar2Color = b.color;
          }
        });
      }

      elt
        .querySelectorAll(".bar-color-selector")
        .forEach((colorSelector: HTMLElement) => {
          colorSelector.addEventListener("click", (e) => {
            bars.forEach((bar) => {
              if (colorSelector.classList.contains("bar" + bar + "-color")) {
                elt
                  .querySelectorAll(".bar" + bar + "-color")
                  .forEach((unselected: HTMLElement) => {
                    unselected.classList.remove("active");
                  });
              }
            });

            colorSelector.classList.add("active");

            if (colorSelector.classList.contains("bar1-color")) {
              bar1Color = colorSelector.dataset.color;
            } else {
              bar2Color = colorSelector.dataset.color;
            }
          });
        });

      elt.querySelector(".save-btn").addEventListener("click", (e) => {
        e.preventDefault();

        const barsResult = {
          "1": {},
          "2": {},
        };

        bars.forEach((bar: string) => {
          const i: number = parseInt(bar, 10);

          const barValue: number = parseFloat(
            (
              elt.querySelector(
                ".bar-" + bar + "-value-custom"
              ) as HTMLInputElement
            ).value
          );
          const barMax: number = parseFloat(
            (
              elt.querySelector(
                ".bar-" + bar + "-max-custom"
              ) as HTMLInputElement
            ).value
          );

          barsResult[bar] = {
            enabled: (
              elt.querySelector("#enabled-bar-" + bar) as HTMLInputElement
            ).checked,
            shared: (elt.querySelector("#share-bar-" + bar) as HTMLInputElement)
              .checked,
            valueType: (
              elt.querySelector(
                ".bar-" + bar + "-value-type"
              ) as HTMLSelectElement
            ).value,
            value: barValue ? barValue : 0,
            maxType: (
              elt.querySelector(
                ".bar-" + bar + "-max-type"
              ) as HTMLSelectElement
            ).value,
            max: barMax ? barMax : 0,
            color: bar == "1" ? bar1Color : bar2Color,
            connected: !!isBarConnected[i],
            connectedValue: isBarConnected[i] ? barConnectedTo[i][0] : null,
            connectedMax: isBarConnected[i] ? barConnectedTo[i][1] : null,
            connectedId: isBarConnected[i] ? barConnectedIds[i] : null,
          };
        });

        const result: TokenBars = {
          bar1: barsResult["1"] as TokenBar,
          bar2: barsResult["2"] as TokenBar,
        };

        const state: SceneState = this.getSceneState();

        const aura: TokenAura = {
          text: textInput.value,
          color: color,
          icons: icons,
          shared: !shareStatusInput.checked,
        };

        this.getClient().send("scene", "updateTokenExtra", {
          aura: aura,
          bars: result,
          key: key,
          scene: state.id,
        });

        item.bars = result;

        for (let i = 1; i <= 2; i++) {
          if (isBarConnected[i]) {
            let val = sheet.getValue(barConnectedTo[i][0]);
            const p = barConnectedTo[i][0];

            let maxVal;

            if (typeof barConnectedTo[i][1] == "number") {
              maxVal = barConnectedTo[i][1];
            } else {
              maxVal = sheet.getValue(barConnectedTo[i][1]);
            }

            const maxP = barConnectedTo[i][1];

            val = parseFloat(val);
            maxVal = parseFloat(maxVal);

            this.getTokenEmitter().updateBarsFromAttributes(
              sheet.id,
              isCraft,
              [
                {
                  val: val,
                  cid: sheet.id,
                  p: p,
                },
                {
                  val: maxVal,
                  cid: sheet.id,
                  p: maxP,
                },
              ],
              true
            );
          }
        }

        $(selectedIconsContainer)
          .find('[data-toggle="tooltip"]')
          .tooltip("dispose");

        popin.close();
      });

      if (tab != null) {
        $("#extra-" + key + "-" + tab + "-tab").tab("show");
      }
    });

    popin.open();
  }

  protected saveBarValue() {
    if (!this.selectedBarImage || !this.selectedBar) {
      return;
    }

    const item: TokenItem = <TokenItem>this.selectedBarImage.item;
    const data: TokenBar = item.bars[this.selectedBar];
    const input: HTMLInputElement = this.barEdit.querySelector("input");

    if (data.value == input.value) {
      return;
    }

    if (data.connected) {
      const p: string = data.connectedValue;
      const val: any = parseFloat(input.value);

      if (item["craft"]) {
        const cid = item["craft"].id;

        EventDispatcher.emit(Events.CRAFT_PERSIST, {
          p: p,
          val: val,
          cid: cid,
        });

        this.getCraftRepository()
          .find(cid)
          .then((craft: any) => {
            this.getCraftRepository().attachSheet(craft);

            craft.sheet.update(p, val, false);
          });
      } else {
        const cid = item.character.id;

        EventDispatcher.emit(Events.CHARACTER_PERSIST, {
          p: p,
          val: val,
          cid: cid,
          all: true,
        });
      }
    } else {
      EventDispatcher.emit(Events.SCENE_ITEM_BAR_SET_VALUE, {
        item: item,
        bar: this.selectedBar,
        value: parseFloat(input.value),
      });
    }
  }

  protected enableEditBarValue(item: SceneImage, bar: string, offset: number) {
    this.barEdit.classList.remove("d-none");

    this.selectedBarImage = item;
    this.selectedBar = bar;

    const stage: Stage = this.getStage();
    const barPosition: Konva.Vector2d = item.getBarPosition();

    const imgPos = item.position();
    const position: Konva.Vector2d = stage.toGlobalPosition(
      imgPos.x + barPosition.x,
      imgPos.y + barPosition.y + offset
    );

    const data: TokenBar = (<TokenItem>item.item).bars[bar];
    const input: HTMLInputElement = this.barEdit.querySelector("input");

    input.value = data.value;

    input.addEventListener("focus", () => {
      input.select();
    });

    // timeout for ff
    setTimeout(() => {
      this.barEdit.querySelector("input").focus();
    }, 0);

    this.barEdit.style.left = position.x.toString(10) + "px";
    this.barEdit.style.top = position.y.toString(10) + "px";
  }

  public unselect() {
    this.menu.classList.add("d-none");
    this.barEdit.classList.add("d-none");

    if (this.selected) {
      this.selected.off("token-ui-move");
    }

    this.saveBarValue();

    this.selected = null;
    this.selectedBar = null;
    this.selectedBarImage = null;
  }

  protected getStage(): Stage {
    return container.get<Stage>(Services.Stage);
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getCodeExecutor(): CodeExecutor {
    return container.get<CodeExecutor>(Services.CodeExecutor);
  }

  protected getCharacterRepository(): CharacterRepository {
    return container.get<CharacterRepository>(Repository.CharacterRepository);
  }

  protected getTokenEmitter(): TokenEmitter {
    return container.get<TokenEmitter>(Emitters.Token);
  }

  protected getCraftRepository(): CraftRepository {
    return container.get<CraftRepository>(Repository.Craft);
  }

  protected getCharacterView(): CharacterView {
    return container.get<CharacterView>(Views.Character);
  }

  protected getCraftView(): CraftView {
    return container.get<CraftView>(Views.Craft);
  }
}
