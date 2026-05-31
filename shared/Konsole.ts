enum MessageType {
  Error,
  Log,
}

export class Konsole {
  protected static container: HTMLElement;
  protected static callbacks: Function[] = [];

  public static setContainer(container: HTMLElement) {
    Konsole.container = container;
  }

  public static error(...args) {
    Konsole.add(MessageType.Error, args);
  }

  public static log(...args) {
    Konsole.add(MessageType.Log, args);
  }

  public static clear() {
    if (Konsole.container) {
      Konsole.container.innerHTML = "";
    }
  }

  public static onMessage(callback: Function) {
    Konsole.callbacks.push(callback);
  }

  protected static add(type: MessageType, data: any[]) {
    for (const i in data) {
      if (type === MessageType.Log) {
        console.log(data[i]);
      } else if (type === MessageType.Error) {
        console.error(data[i]);
      }
    }

    if (!Konsole.container) {
      return;
    }

    const message = document.createElement("div");
    message.classList.add("message");

    if (type === MessageType.Error) {
      message.classList.add("error");
    }

    if (type === MessageType.Log) {
      message.classList.add("log");
    }

    for (const i in data) {
      const item: HTMLElement = document.createElement("pre");

      if (typeof data[i] === "string" || typeof data[i] === "number") {
        item.innerText = data[i];
      } else {
        item.innerText = JSON.stringify(data[i], null, 2);
      }

      message.appendChild(item);
    }

    Konsole.container.appendChild(message);

    Konsole.callbacks.forEach((callback: Function) => {
      callback(data, type);
    });
  }
}
