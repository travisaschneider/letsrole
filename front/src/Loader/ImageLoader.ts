import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { Image as KonvaImage } from "konva/lib/shapes/Image";

export class ImageLoader {
  protected static alreadyLoaded: string[] = [];
  protected static loadingCallbacks: LoadingCallbacks = {};
  protected static nodes: Images = {};

  public constructor(path: string, params: any, callback: Function) {
    if (ImageLoader.alreadyLoaded.indexOf(path) >= 0) {
      const img: HTMLImageElement = ImageLoader.nodes[path];

      params.image = img;
      const node: KonvaImage = new KonvaImage(params);

      return callback.call(this, node);
    }

    if (ImageLoader.loadingCallbacks[path]) {
      ImageLoader.loadingCallbacks[path].push(callback);
    } else {
      const img: HTMLImageElement = new Image();
      img.setAttribute("crossOrigin", "Anonymous");

      img.onload = () => {
        ImageLoader.nodes[path] = img;

        params.image = img;

        ImageLoader.alreadyLoaded.push(path);

        for (const cb of ImageLoader.loadingCallbacks[path]) {
          const node: KonvaImage = new KonvaImage(params);
          cb.call(this, node);
        }

        delete ImageLoader.loadingCallbacks[path];

        EventDispatcher.emit(Events.LOADING_END);
      };

      img.onerror = () => {
        EventDispatcher.emit(Events.LOADING_END);
      };

      ImageLoader.loadingCallbacks[path] = [];
      ImageLoader.loadingCallbacks[path].push(callback);

      EventDispatcher.emit(Events.LOADING_START);
      img.src = path;
    }
  }

  public static load(path: string, params: any, callback: Function) {
    return new ImageLoader(path, params, callback);
  }
}

interface LoadingCallbacks {
  [path: string]: Function[];
}

interface Images {
  [path: string]: HTMLImageElement;
}
