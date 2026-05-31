import Konva from "konva";
import { ImageLoader } from "../Loader/ImageLoader";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events, SceneItemDragMoveEvent } from "../Event/Events";
import {
  CharacterColors,
  CraftItem,
  JournalItem,
  LayerItemType,
  TokenAura,
  TokenAuraIcon,
  TokenBar,
  TokenBars,
  TokenItem,
} from "../../shared/Scene/SceneData";
import { SuperGif } from "./Util/SuperGif/dist/super-gif";
import { SceneElement } from "./SceneElement";
import { CancelState } from "../State/CancelState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";
import { UserState } from "../State/UserState";
import { CharacterState } from "../State/CharacterState";
import { CharacterRepository } from "../Repository/CharacterRepository";
import { Repository } from "../DependencyInjection/Repository";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { View } from "../View/View";
import { JournalIcon } from "../../shared/Journal";
import { journalIcons } from "../View/JournalView";
import { KeyboardState } from "../State/KeyboardState";
import { Collision, Vector } from "./Board/DynamicLighting/Collision";
import { Services } from "../DependencyInjection/Services";
import KonvaEventObject = Konva.KonvaEventObject;
import Vector2d = Konva.Vector2d;

export class SceneImage extends SceneElement {
  public static readonly TransformerPadding = 5;

  public isInit = false;

  protected params: any;

  protected image: Konva.Image;
  protected content: Konva.Group;
  protected status: Konva.Group;
  protected icons: Konva.Group;
  protected transformer: Konva.Transformer;
  protected aura: Konva.Group;
  protected bars: Konva.Group;
  protected color: Konva.Group;
  protected frame: Konva.Group;
  protected background: Konva.Rect;

  protected isSelected = false;
  protected cacheEnabled = true;
  protected cacheTimeout;

  protected clearExtraTimeout: any;
  protected moveInterval;
  protected transformInterval;
  protected isTransforming = false;
  protected prevPosition: Konva.Vector2d = { x: 0, y: 0 };
  protected prevTransform = { scale: 1, rotation: 0, x: 0, y: 0 };

  protected collision: Collision;

  public barCount = 0;

  protected static EditBar: Konva.Image;

  public constructor(params?: any) {
    super({
      x: params.item.x,
      y: params.item.y,
      draggable: params.draggable,
    });

    this._item = params.item;
    this._layer = params.layer;
    this.params = params;

    params.x = 0;
    params.y = 0;
    params.draggable = false;
    params.width = this.item.width;
    params.height = this.item.height;

    this.content = new Konva.Group();
    this.add(this.content);

    if (this.item.type === LayerItemType.Journal) {
      this.initJournal();
      return;
    }

    const parts: string[] = this.item.path.split(".");
    const ext: string = parts.pop();

    switch (ext) {
      case "gif":
        this.initAnimatedImage();
        break;

      case "webm":
      case "m4v":
      case "mp4":
      case "avi":
        this.initVideo();
        break;

      default:
        this.initStaticImage();
        break;
    }
  }

  public getImage(): Konva.Image {
    return this.image;
  }

  public getContent(): Konva.Group {
    return this.content;
  }

  protected getUrl(): string {
    const r = Math.random().toString(36).substring(7);

    return (
      window["configuration"]["cdnReadUrl"] + "/" + this.item.path + "?r=" + r
    );
  }

  protected getPosterUrl(): string {
    const parts = this.item.path.split(".");
    parts.pop();

    const posterPath = parts.join(".") + "-poster.jpg";

    return window["configuration"]["cdnReadUrl"] + "/" + posterPath;
  }

  protected initStaticImage() {
    ImageLoader.load(this.getUrl(), this.params, (node: Konva.Image) => {
      this.image = node;
      this.content.add(node);
      this.image.zIndex(0);
      this.init();
    });
  }

  protected initJournal() {
    Konva.Image.fromURL(this.getJournalIconSvgUrl(), (node: Konva.Image) => {
      this.image = node;

      this.image.width(this.item.width);
      this.image.height(this.item.height);

      const size: number =
        Math.max(this.image.width(), this.image.height()) * 1.6;
      const x: number = (this.image.width() - size) / 2;
      const y: number = (this.image.height() - size) / 2;

      this.background = new Konva.Rect({
        x: x,
        y: y,
        width: size,
        height: size,
        cornerRadius: size / 7,
        fill: View.getDefaultSkinColor(),
      });

      this.content.add(this.background);
      this.content.add(node);

      this.image.zIndex(1);
      this.init();
    });
  }

  protected initVideo() {
    const video: HTMLVideoElement = document.createElement(
      "video"
    ) as HTMLVideoElement;

    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.setAttribute("crossOrigin", "Anonymous");
    video.src = this.getUrl();

    this.image = new Konva.Image({
      x: 0,
      y: 0,
      image: video as any,
    });

    this.content.add(this.image);
    this.image.zIndex(0);

    const onPlay = () => {
      video.removeEventListener("play", onPlay);
      this.init();
    };

    video.addEventListener("loadedmetadata", () => {
      this.image.width(video.videoWidth);
      this.image.height(video.videoHeight);
    });
    video.addEventListener("play", onPlay);
    video.addEventListener("error", (e) => {
      console.error(e);
    });
    video.addEventListener("canplay", () => {
      video.play();
    });

    EventDispatcher.emit(Events.BOARD_IS_ANIMATED, {
      item: this,
    });

    this.cacheEnabled = false;
  }

  protected initAnimatedImage() {
    const img = document.createElement("img") as HTMLImageElement;
    img.setAttribute("crossOrigin", "anonymous");

    img.addEventListener("load", (e) => {
      const sg = new SuperGif(img, {});

      sg.load((e) => {
        const canvas = sg.getCanvas() as any;
        canvas.willReadFrequently = true;

        this.image = new Konva.Image({
          image: canvas,
        });

        this.content.add(this.image);
        this.image.zIndex(0);
        sg.play();

        EventDispatcher.emit(Events.BOARD_IS_ANIMATED, {
          item: this,
        });

        this.init();
      });
    });

    img.src = this.getUrl();
    this.cacheEnabled = false;
  }

  public updateMouseEvents() {
    if (
      (this.isLocked && !this.isJournal()) ||
      (!this.canTransform() && !this.canDrag() && !this.isJournal())
    ) {
      this.listening(false);
    } else {
      this.listening(true);
    }
  }

  public canUpdateJournal(): boolean {
    const isOwner: boolean =
      this.item.userId && this.item.userId === this.getUserState().id;

    return (
      isOwner || !(this.isLocked || (!this.canTransform() && !this.canDrag()))
    );
  }

  public onLockChange() {
    this.updateMouseEvents();
  }

  public updateTransform() {
    if (this.item.transformation !== undefined) {
      this.content.scale({
        x: this.item.transformation.scale,
        y: this.item.transformation.scale,
      });

      this.content.rotation(this.item.transformation.rotation);

      this.content.position({
        x: this.item.transformation.x,
        y: this.item.transformation.y,
      });
    }
  }

  protected init(): void {
    this.updateMouseEvents();
    this.updateTransform();

    let dragStartPositon: Vector;

    this.on("mousedown", (evt: KonvaEventObject<MouseEvent>) => {
      evt.cancelBubble = true;

      if (this.getKeyboardState().isShiftDown()) {
        EventDispatcher.emit(Events.SCENE_ITEM_GROUP_SELECT, {
          item: this,
        });
      } else {
        EventDispatcher.emit(Events.BOARD_CLICK, {
          item: this,
        });

        this.onClick();
      }
    });

    this.on("mouseover", () => {
      document.body.style.cursor = "move";

      if (this.isJournal()) {
        document.body.style.cursor = "pointer";
        this.background.fill(View.getPrimarySkinColor());
      }
    });

    this.on("mouseout", () => {
      document.body.style.cursor = "default";

      if (this.isJournal()) {
        this.background.fill(View.getDefaultSkinColor());
      }
    });

    this.on("dblclick", () => {
      if (this.isJournal() && this.canUpdateJournal()) {
        EventDispatcher.emit(Events.JOURNAL_OPEN, {
          keyid: (this.item as JournalItem).keyid,
        });

        return;
      }

      if (this.isTokenEditable()) {
        if (this.item.type === LayerItemType.Craft) {
          EventDispatcher.emit(Events.CRAFT_OPEN_SHEET, {
            id: (this.item as CraftItem).craft.id,
            token: this._item,
          });
        }

        if (this.item.type === LayerItemType.Token) {
          EventDispatcher.emit(Events.CHARACTER_OPEN_SHEET, {
            id: (this.item as TokenItem).character.id,
          });
        }
      }
    });

    this.on("dragstart", (e) => {
      if (this.isLocked) {
        this.stopDrag();
        return;
      }

      const pos: Konva.Vector2d = this.position();
      dragStartPositon = pos;

      this.getCancelState().add(() => {
        this.position({
          x: pos.x,
          y: pos.y,
        });

        EventDispatcher.emit(Events.SCENE_ITEM_DRAGMOVE, {
          item: this,
          x: pos.x,
          y: pos.y,
        });
      });

      clearInterval(this.moveInterval);

      this.moveInterval = setInterval(() => {
        this.onMoveFire();
      }, 1000 / 30);
    });

    this.on("dragend", (e) => {
      const pos: Konva.Vector2d = this.position();

      dragStartPositon = undefined;

      EventDispatcher.emit(Events.SCENE_ITEM_DRAGEND, {
        item: this,
        x: pos.x,
        y: pos.y,
      });

      this.item.x = pos.x;
      this.item.y = pos.y;

      clearInterval(this.moveInterval);
    });

    this.on("dragmove", (e) => {
      if (this.getCollision().isEnabled() && this.isToken()) {
        const target = new Vector(e.evt.clientX, e.evt.clientY);
        const center = this.getCenter();

        const updatedPositon = this.getCollision().apply(
          new Vector(
            dragStartPositon.x + center.x,
            dragStartPositon.y + center.y
          ),
          target,
          center.x
        );

        this.setPosition({
          x: updatedPositon.x - center.x,
          y: updatedPositon.y - center.y,
        });
        dragStartPositon = this.position();
      }

      this.fire("token-ui-move", e);
    });

    this.color = new Konva.Group();
    this.content.add(this.color);
    this.color.moveToTop();

    this.frame = new Konva.Group();
    this.content.add(this.frame);

    this.bars = new Konva.Group();
    this.add(this.bars);

    this.aura = new Konva.Group();
    this.content.add(this.aura);

    this.initStatus();
    this.updateExtras();

    this.updateTransformable();
    this.isInit = true;

    EventDispatcher.emit(Events.SCENE_ITEM_INITIALIZED, {
      item: this,
    });

    this.fire("initialized");
  }

  protected onMoveFire() {
    const pos: Konva.Vector2d = this.position();

    if (pos.x === this.prevPosition.x && pos.y === this.prevPosition.y) {
      return;
    }

    const event: SceneItemDragMoveEvent = {
      item: this,
      x: pos.x,
      y: pos.y,
    };

    if (this.prevPosition.x !== 0 || this.prevPosition.y !== 0) {
      event.diffX = pos.x - this.prevPosition.x;
      event.diffY = pos.y - this.prevPosition.y;
    }

    EventDispatcher.emit(Events.SCENE_ITEM_DRAGMOVE, event);

    this.updatePrevPosition();
  }

  public updatePrevPosition() {
    this.prevPosition = this.position();
  }

  protected onTransformFire() {
    const transform: any = {
      scale: this.content.scaleX(),
      rotation: this.content.rotation(),
      x: this.content.x(),
      y: this.content.y(),
    };

    if (transform.scale === this.prevTransform.scale) {
      if (transform.rotation === this.prevTransform.rotation) {
        if (transform.x === this.prevTransform.x) {
          if (transform.y === this.prevTransform.y) {
            return;
          }
        }
      }
    }

    EventDispatcher.emit(Events.SCENE_ITEM_TRANSFORM, {
      item: this,
      scale: transform.scale,
      rotation: transform.rotation,
      x: transform.x,
      y: transform.y,
    });

    this.prevTransform = transform;

    this.updateBars();
    this.updateStatus();
  }

  public removeTransformer() {
    if (this.transformer) {
      this.transformer.remove();
      this.transformer.destroy();
    }
  }

  public hideTransformer() {
    if (this.transformer) {
      this.transformer.hide();
    }
  }

  public updateTransformable() {
    this.removeTransformer();

    if (!this.params.transformable) {
      return;
    }

    this.transformer = new Konva.Transformer({
      keepRatio: true,
      borderStroke: View.getPrimarySkinColor(),
      anchorStroke: View.getPrimarySkinColor(),
      enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"],
      centeredScaling: false,
      rotationSnaps: [0, 90, 180, 270],
      anchorCornerRadius: 3,
      anchorSize: 12,
      anchorFill: "white",
      rotateAnchorOffset: 30,
      padding: SceneImage.TransformerPadding,
    });

    this.add(this.transformer);
    this.transformer.hide();
    this.transformer.nodes([this.content]);

    this.content.off("transformstart");
    this.content.off("transform");
    this.content.off("transformend");

    this.content.on("transformstart", () => {
      this.isTransforming = true;
      this.clearExtra(true);
      this.icons.opacity(0);

      const scale: number = this.content.scaleX();
      const rotation: number = this.content.rotation();
      const x: number = this.content.x();
      const y: number = this.content.y();

      this.getCancelState().add(() => {
        this.content.scale({
          x: scale,
          y: scale,
        });

        this.content.rotation(rotation);
        this.content.x(x);
        this.content.y(y);

        EventDispatcher.emit(Events.SCENE_ITEM_TRANSFORM, {
          item: this,
          scale: scale,
          rotation: rotation,
          x: x,
          y: y,
        });
      });

      clearInterval(this.transformInterval);

      this.transformInterval = setInterval(() => {
        this.onTransformFire();
      }, 1000 / 30);
    });

    this.content.on("transform", (e) => {
      this.fire("token-ui-transform", e);
    });

    this.content.on("transformend", () => {
      this.isTransforming = false;
      this.icons.opacity(1);

      EventDispatcher.emit(Events.SCENE_ITEM_TRANSFORM_END, {
        item: this,
        scale: this.content.scaleX(),
        rotation: this.content.rotation(),
        x: this.content.x(),
        y: this.content.y(),
      });

      clearInterval(this.transformInterval);

      this.updateExtras();
    });
  }

  public getCenter(): Vector2d {
    const transform: any = this.content.getTransform();
    const pos: Vector2d = {
      x: this.item.width / 2,
      y: this.item.height / 2,
    };

    const center: Vector2d = transform.point(pos);

    return center;
  }

  protected onClick() {
    if (this.isJournal() && !this.canUpdateJournal()) {
      EventDispatcher.emit(Events.JOURNAL_OPEN, {
        keyid: (this.item as JournalItem).keyid,
      });
    }

    if (this.isSelected || this.isLocked) {
      return;
    }

    if (this.params.transformable && this.transformer) {
      this.transformer.show();
      this.transformer.moveToTop();
    }

    this.isSelected = true;

    EventDispatcher.emit(Events.SCENE_ITEM_SELECT, {
      item: this,
    });
  }

  public onClickOutside() {
    this.isSelected = false;

    if (this.canTransform() && this.transformer) {
      this.transformer.hide();
    }

    this.shouldDrawHit();
  }

  public getImageOffset(): Konva.Vector2d {
    return this.image.position();
  }

  public updateControls() {
    const uid: number = this.getUserState().id;

    if (this.getUserState().isGm()) {
      return;
    }

    let found = false;

    this.item.controls.forEach((id: number) => {
      if (id === uid) {
        found = true;
      }
    });

    if (found) {
      this.params.draggable = true;
      this.params.transformable = true;
      this.draggable(true);
    } else {
      this.params.draggable = false;
      this.params.transformable = false;
      this.draggable(false);
    }

    this.updateMouseEvents();
    this.updateTransformable();
  }

  public updateExtras() {
    this.updateBars();
    this.updateColor();
    this.updateFrame();
    this.updateStatus();
  }

  public updateFrame(framePath?: string) {
    if (!this.frame) {
      return;
    }

    if (!framePath) {
      framePath = (<TokenItem>this.item).frame;
    }

    if (!framePath) {
      this.frame.removeChildren();
      return;
    }

    ImageLoader.load("/assets/frame/" + framePath, {}, (node: Konva.Image) => {
      const w: number = this.image.width() * this.image.scaleX() * 1.45;
      const h: number = this.image.height() * this.image.scaleY() * 1.45;
      const ratio: number = (this.image.width() * this.image.scaleX()) / w;

      node.width(w);
      node.height(h);
      node.x((this.image.width() * this.image.scaleX() - w) / 2);
      node.y((this.image.height() * this.image.scaleY() - h) / 2);
      this.frame.add(node);
    });
  }

  public updateColor(newColor?: string) {
    if (!this.color) {
      return;
    }

    if (this.item.type === LayerItemType.Token) {
      if (!(this.item as TokenItem).character) {
        return;
      }
    }

    const tokenItem: TokenItem = this.item as TokenItem;
    let borderColor: string = null;

    const apply = () => {
      this.color.removeChildren();

      if (borderColor) {
        const color = new Konva.Circle({
          x: (this.image.width() * this.image.scaleX()) / 2,
          y: (this.image.height() * this.image.scaleX()) / 2,
          stroke: borderColor,
          strokeWidth: 5,
          rotation: -90,
          radius: (this.image.width() * this.image.scaleX()) / 2,
        });

        this.color.add(color);
      }
    };

    if (newColor) {
      borderColor = CharacterColors[newColor];
      apply();
    } else {
      if (tokenItem.character) {
        this.getCharacterRepository()
          .get(tokenItem.character.id)
          .then((sheet: CharacterSheet) => {
            if (sheet) {
              if (CharacterColors[sheet.character.color]) {
                borderColor = CharacterColors[sheet.character.color];
              }

              apply();
            }
          });
      }
    }
  }

  public updateStatus() {
    if (!this.status) {
      return;
    }

    if (this.isTransforming) {
      return;
    }

    const token: TokenItem = this.item as TokenItem;
    const status: TokenAura = token.aura;

    this.status.removeChildren();
    this.icons.removeChildren();

    if (!status) {
      return;
    }

    const currentSheet: CharacterSheet = this.getCharacterState().sheet;

    if (
      currentSheet &&
      token.character &&
      token.character.id == currentSheet.character.id
    ) {
      this.status.opacity(1);
    } else {
      this.status.opacity(0);
    }

    const center: Konva.Vector2d = this.getCenter();
    const size: any = this.image.getSize();

    let scale = 1;

    if (this.item.transformation && this.item.transformation.scale) {
      scale = this.item.transformation.scale;
    }

    this.status.x(center.x);
    this.status.y(center.y + 25 * scale);

    let text: string = status.text.trim();

    if (text) {
      text = text.toUpperCase();

      const fontSize: number = Math.round(11 * scale);

      const label: Konva.Label = new Konva.Label({
        x: 0,
        y: 0,
      });

      const statusText: Konva.Text = new Konva.Text({
        text: text,
        fontStyle: "bold",
        fill: "#ffffff",
        verticalAlign: "middle",
        width: size.width * scale,
        wrap: "word",
        ellipsis: true,
        fontSize: fontSize,
        fontFamily: "opensans, Arial, Verdana, sans-serif",
        align: "center",
        padding: 8,
      });

      label.add(
        new Konva.Tag({
          fill: status.color + "b4",
          pointerDirection: "up",
          cornerRadius: 5,
        })
      );

      label.add(statusText);

      this.status.add(label);
    }

    if (!this.shouldDisplayIcons()) {
      return;
    }

    if (status.icons) {
      const startAngle = 0;
      const iconArcMaxAngle = 270;
      const stepAngle: number = iconArcMaxAngle / status.icons.length;

      const iconSize = 48;
      const center: Vector2d = this.getCenter();
      center.x -= scale * (iconSize / 2);
      center.y -= scale * (iconSize / 2);
      const r: number = (scale * size.width) / 2;
      const deg2rad: number = Math.PI / 180.0;
      const cdnUrl: string = window["configuration"]["cdnReadUrl"];

      status.icons.forEach((icon: TokenAuraIcon, num: number) => {
        const angle: number =
          deg2rad * (startAngle - stepAngle / 2 - stepAngle * num);

        const x: number = r * Math.cos(angle) + center.x;
        const y: number = r * Math.sin(angle) + center.y;
        const iconPos: Vector2d = { x, y };
        const iconUrl: string = cdnUrl + "/" + icon.path + "?mode=ingame";

        ImageLoader.load(iconUrl, {}, (node: Konva.Image) => {
          node.setPosition(iconPos);
          node.setSize({
            width: iconSize * scale,
            height: iconSize * scale,
          });

          this.icons.add(node);
        });
      });
    }
  }

  public updateBars() {
    if (
      this.item.type !== LayerItemType.Token &&
      this.item.type !== LayerItemType.Craft
    ) {
      return;
    }

    if (this.item.type === LayerItemType.Token) {
      if (!(this.item as TokenItem).character) {
        return;
      }
    }

    if (this.bars) {
      this.bars.removeChildren();
    }

    const data: TokenBars = (<TokenItem>this.item).bars;

    let scale = 1;

    if (this.item.transformation && this.item.transformation.scale) {
      scale = this.item.transformation.scale;
    }

    this.bars.position(this.getBarPosition());

    if (!data) {
      return;
    }

    const isMine: boolean = this.isTokenEditable();

    let bar1: TokenBar = { ...{}, ...data.bar1 };
    const bar2: TokenBar = { ...{}, ...data.bar2 };
    let count = 0;
    let value1: number;
    let max1: number;
    let value2: number;
    let max2: number;

    if (bar2 && bar2.enabled) {
      if (
        !bar1 ||
        (bar1 && !bar1.enabled) ||
        (bar1 && bar1.enabled && !isMine && !bar1.shared)
      ) {
        bar1 = { ...{}, ...bar2 };
        bar2.enabled = false;
      }
    }

    if (bar1 && bar1.enabled) {
      if (isMine || bar1.shared) {
        count++;

        value1 = bar1.value;
        max1 = bar1.max;
      }
    }

    if (bar2 && bar2.enabled) {
      if (isMine || bar2.shared) {
        value2 = bar2.value;
        max2 = bar2.max;

        count++;
      }
    }

    this.barCount = count;

    value1 = Math.max(value1, 0);
    value2 = Math.max(value2, 0);
    max1 = Math.max(max1, 0);
    max2 = Math.max(max2, 0);

    if (!value1) value1 = 0;
    if (!max1) max1 = 1;
    if (value1 > max1) value1 = max1;
    if (!value2) value2 = 0;
    if (!max2) max2 = 1;
    if (value2 > max2) value2 = max2;

    if (count === 0) {
      return;
    }

    const createBar = (
      value: number,
      max: number,
      color: string,
      yOffset: number,
      code: string
    ): Konva.Group => {
      const width: number = this.image.width() * this.content.scaleX();
      yOffset *= scale;

      let valueStr: number = value;
      let maxStr: number = max;

      if (!valueStr) valueStr = 0;
      if (!maxStr) maxStr = 0;
      if (valueStr > maxStr) valueStr = maxStr;

      const labelValue: string =
        valueStr.toString(10) + "/" + maxStr.toString(10);
      const ratio: number = value / max;
      const height: number = 6 * scale;
      const barContent: Konva.Group = new Konva.Group();

      const bg: Konva.Rect = new Konva.Rect({
        fill: "#0f0f0f",
        opacity: 0.5,
        cornerRadius: height / 2,
        x: 0,
        y: 0,
        width: width,
        height: height,
      });

      const bar: Konva.Rect = new Konva.Rect({
        fill: color,
        x: 0,
        y: 0,
        width: width * ratio,
        height: height,
        cornerRadius: height / 2,
        listening: false,
      });

      let editBtn: Konva.Image;

      const addIcon = () => {
        editBtn = SceneImage.EditBar.clone();
        editBtn.x(width - 10 * scale);
        editBtn.y(2 * scale);
        editBtn.opacity(0);
        editBtn.width(8 * scale);
        editBtn.height(8 * scale);
        editBtn.listening(false);

        barContent.add(editBtn);
        editBtn.moveToTop();
      };

      if (SceneImage.EditBar) {
        addIcon();
      } else {
        ImageLoader.load(
          "/assets/img/bar-edit.png",
          {},
          (editBar: Konva.Image) => {
            SceneImage.EditBar = editBar;
            addIcon();
          }
        );
      }

      const label: Konva.Text = new Konva.Text({
        x: 3 * scale,
        y: scale,
        text: labelValue,
        fill: "#ffffff",
        fontFamily: "sans-serif",
        fontSize: Math.round(10 * scale),
        opacity: 0,
        listening: false,
      });

      barContent.on("pointerenter", () => {
        clearTimeout(this.clearExtraTimeout);

        const targets: Konva.Node[] = [bg, bar];

        for (const target of targets) {
          const tween: Konva.Tween = new Konva.Tween({
            node: target,
            scaleY: 2,
            duration: 0.3,
          });

          tween.play();
        }

        const alphaTargets: Konva.Node[] = [label];

        if (editBtn) {
          alphaTargets.push(editBtn);
        }

        for (const target of alphaTargets) {
          const tween: Konva.Tween = new Konva.Tween({
            node: target,
            opacity: 1,
            duration: 0.3,
          });

          tween.play();
        }
      });

      barContent.on("pointerleave", () => {
        const targets: Konva.Node[] = [bg, bar];

        for (const target of targets) {
          const tween: Konva.Tween = new Konva.Tween({
            node: target,
            scaleY: 1,
            duration: 1.2,
          });

          tween.play();
        }

        const alphaTargets: Konva.Node[] = [label];

        if (editBtn) {
          alphaTargets.push(editBtn);
        }

        for (const target of alphaTargets) {
          const tween: Konva.Tween = new Konva.Tween({
            node: target,
            opacity: 0,
            duration: 1.2,
          });

          tween.play();
        }

        this.clearExtra();
      });

      barContent.on("pointerdown", (evt) => {
        evt.cancelBubble = true;

        EventDispatcher.emit(Events.SCENE_ITEM_BAR_VALUE, {
          item: this,
          bar: code,
          offset: yOffset,
        });
      });

      barContent.add(bg);
      barContent.add(bar);
      barContent.add(label);

      if (editBtn) {
        editBtn.moveToTop();
      }

      barContent.y(barContent.y() + yOffset);

      return barContent;
    };

    if (count === 1) {
      const b: Konva.Group = createBar(value1, max1, bar1.color, 0, "bar1");
      this.bars.add(b);
    } else {
      const b1: Konva.Group = createBar(value1, max1, bar1.color, -8, "bar1");
      const b2: Konva.Group = createBar(value2, max2, bar2.color, +8, "bar2");

      this.bars.add(b1);
      this.bars.add(b2);
    }
  }

  public getBarPosition(): Konva.Vector2d {
    const center: Konva.Vector2d = this.getCenter();

    let scale = 1;

    if (this.item.transformation && this.item.transformation.scale) {
      scale = this.item.transformation.scale;
    }

    return {
      x: center.x - scale * (this.image.getSize().width / 2),
      y: center.y - scale * (30 + this.image.getSize().height / 2),
    };
  }

  protected initStatus() {
    this.icons = new Konva.Group();
    this.add(this.icons);
    this.icons.moveToTop();

    this.status = new Konva.Group();
    this.add(this.status);
    this.status.moveToTop();

    if (this.shouldAlwaysDisplayExtra()) {
      this.status.opacity(1);
    } else {
      this.status.opacity(0);
      this.bars.opacity(0);

      this.content.on("pointerover", () => {
        if (this.isTransforming) {
          return;
        }

        clearTimeout(this.clearExtraTimeout);

        const items: Konva.Node[] = [this.status, this.bars];

        for (const item of items) {
          const tween: Konva.Tween = new Konva.Tween({
            node: item,
            opacity: 1,
            duration: 0.25,
          });

          tween.play();
        }
      });

      this.content.on("pointerout", () => {
        if (this.isTransforming) {
          return;
        }

        this.clearExtra();
      });
    }
  }

  protected clearExtra(now = false): void {
    if (this.shouldAlwaysDisplayExtra()) {
      return;
    }

    const doClear = () => {
      const items: Konva.Node[] = [this.status, this.bars];

      for (const item of items) {
        const tween: Konva.Tween = new Konva.Tween({
          node: item,
          opacity: 0,
          duration: 0.25,
        });

        tween.play();
      }
    };

    clearTimeout(this.clearExtraTimeout);

    if (now) {
      doClear();
    } else {
      this.clearExtraTimeout = setTimeout(() => {
        doClear();
      }, 2000);
    }
  }

  protected shouldAlwaysDisplayExtra(): boolean {
    const token: TokenItem = this.item as TokenItem;
    const currentSheet: CharacterSheet = this.getCharacterState().sheet;

    if (
      token &&
      token.type === LayerItemType.Token &&
      token.character &&
      currentSheet
    ) {
      if (token.character.id === currentSheet.character.id) {
        return true;
      }
    }

    return false;
  }

  public isToken(): boolean {
    return this.params.item && this.params.item.type === "token";
  }

  public isCraft(): boolean {
    return this.params.item && this.params.item.type === "craft";
  }

  public isJournal(): boolean {
    return this.params.item && this.params.item.type === LayerItemType.Journal;
  }

  public isTokenEditable(): boolean {
    if (!this.isToken()) {
      if (this.isCraft() && this.getUserState().isGm()) {
        return true;
      }

      return false;
    }

    if (this.getUserState().isGm()) {
      return true;
    }

    const item: TokenItem = this.item as TokenItem;

    const character = this.getCharacterState().sheet.character;

    if (!character) {
      return false;
    }

    if (item.character.id === character.id) {
      return true;
    }

    return false;
  }

  public canTransform(): boolean {
    return this.params.transformable;
  }

  public canDrag(): boolean {
    return this.params.draggable;
  }

  public getTransformer(): Konva.Transformer {
    return this.transformer;
  }

  protected shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = Math.round((R * (100 + percent)) / 100);
    G = Math.round((G * (100 + percent)) / 100);
    B = Math.round((B * (100 + percent)) / 100);

    R = R < 255 ? R : 255;
    G = G < 255 ? G : 255;
    B = B < 255 ? B : 255;

    const RR =
      R.toString(16).length == 1 ? "0" + R.toString(16) : R.toString(16);
    const GG =
      G.toString(16).length == 1 ? "0" + G.toString(16) : G.toString(16);
    const BB =
      B.toString(16).length == 1 ? "0" + B.toString(16) : B.toString(16);

    return "#" + RR + GG + BB;
  }

  public getJournalIcon(): JournalIcon {
    if ((this.item as JournalItem).icon) {
      return (this.item as JournalItem).icon;
    }

    return JournalIcon.Page;
  }

  protected getJournalIconSvgUrl(): string {
    const icon: JournalIcon = this.getJournalIcon();

    for (const entry of journalIcons) {
      if (entry.type == icon) {
        return entry.svgUrl;
      }
    }

    return journalIcons[0].svgUrl;
  }

  protected shouldDisplayIcons(): boolean {
    if (!this.isCraft() && !this.isToken()) {
      return false;
    }

    const item: TokenItem = <TokenItem>this.item;

    if (!item.aura) {
      return false;
    }

    if (item.userId === this.getUserState().id) {
      return true;
    }

    if (item.aura.shared === undefined || item.aura.shared === true) {
      return true;
    }

    return false;
  }

  public shouldSnapToGrid(): boolean {
    if (this.isJournal()) {
      return false;
    }

    return true;
  }

  protected getCancelState(): CancelState {
    return container.get<CancelState>(States.Cancel);
  }

  protected getCharacterState(): CharacterState {
    return container.get<CharacterState>(States.Character);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getKeyboardState(): KeyboardState {
    return container.get<KeyboardState>(States.Keyboard);
  }

  protected getCharacterRepository(): CharacterRepository {
    return container.get<CharacterRepository>(Repository.CharacterRepository);
  }

  protected getCollision(): Collision {
    if (this.collision === undefined) {
      this.collision = container.get<Collision>(Services.Collision);
    }

    return this.collision;
  }
}
