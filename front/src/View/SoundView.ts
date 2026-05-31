import { injectable } from "inversify";
import { View } from "./View";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { DockableView, ViewOpenMode } from "./DockableView";
import { MenuView } from "./MenuView";
import { Views } from "../DependencyInjection/Views";
import { container } from "../DependencyInjection/Container";
import { Template } from "./Template";
import { Popin } from "./Popin/Popin";
import { PopinManager } from "./Popin/PopinManager";
import { Services } from "../DependencyInjection/Services";
import { WavEncoder } from "./Sound/WavEncoder";
import { Transformers } from "./Sound/Transformers";
import { AudioTransformer } from "./Sound/AudioTransformer";
import $ from "jquery";
import { SoundPlayer } from "./Sound/SoundPlayer";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { PersistedState } from "../State/PersistedState";
import { States } from "../DependencyInjection/State";
import { UserState } from "../State/UserState";

@injectable()
export class SoundView extends View {
  protected taskBarItem: TaskBarItem;
  protected view: DockableView;
  protected isScriptLoaded = false;

  public init() {
    this.taskBarItem = new TaskBarItem(
      this.__("SFX"),
      "fas fa-waveform",
      TaskBarCategory.Audio
    );

    this.view = new DockableView({
      id: "sound",
      title: this.__("SFX"),
      html: Template.render("sound/panel.html.njk"),
      taskBarItem: this.taskBarItem,
      mode: ViewOpenMode.DockLeft,
      icon: "fas fa-waveform",
      defaultConfiguration: {
        index: 9,
        hidden: true,
        minimized: false,
        mode: ViewOpenMode.DockLeft,
      },
    });

    this.getUi().register(this.view);
    this.getTaskBarView().add(this.taskBarItem);

    EventDispatcher.on(Events.USER_ME_LOADED, () => {
      this.initPanel();
    });
  }

  public prevent(prevent: boolean) {
    if (this.getUserState().isGm()) {
      return;
    }

    if (prevent) {
      this.view.close();
      this.taskBarItem.hide();
    } else {
      this.taskBarItem.show();
    }
  }

  public static transformVolume(volume: number): number {
    const curve = 2.5;
    return Math.pow(volume, curve) / Math.pow(100, curve - 1);
  }

  protected initPanel() {
    this.view.container
      .querySelector(".explore-sounds-btn")
      .addEventListener("click", (e) => {
        e.preventDefault();

        this.openLibrary();
      });

    this.reloadSelect();

    const playlistSelect: HTMLSelectElement = this.view.container.querySelector(
      ".playlist-select"
    ) as HTMLSelectElement;
    const content: HTMLElement = this.view.container.querySelector(
      ".content"
    ) as HTMLElement;
    let pid: number = null;

    const reloadPlaylist = () => {
      this.getClient().get(
        "sound",
        "loadPlaylist",
        {
          pid: pid,
        },
        (response) => {
          if (response.found == false) {
            content.innerText = this.__("No playlist selected.");
            return;
          }

          content.innerHTML = Template.render(
            "sound/panel-playlist.html.njk",
            response
          );
          this.initSoundList(content);
        }
      );
    };

    playlistSelect.addEventListener("change", () => {
      const id = playlistSelect.value;

      if (id == "") {
        content.innerText = this.__("No playlist selected.");
        return;
      }

      pid = parseInt(id, 10);
      reloadPlaylist();
    });

    EventDispatcher.on(Events.SOUND_PLAYLIST_RELOAD, (e) => {
      if (e.pid === pid) {
        reloadPlaylist();
      }
    });

    const volume: HTMLInputElement = this.view.container.querySelector(
      ".volume input"
    ) as HTMLInputElement;

    volume.addEventListener("change", (e) => {
      const vol: number = parseInt(volume.value, 10) / 100;
      this.getSoundPlayer().volume = vol;
      this.getPersistedState().set("soundvolume", vol);
    });

    const defaultVolume = this.getPersistedState().get("soundvolume", 0.5);
    this.getSoundPlayer().volume = defaultVolume;

    volume.value = (defaultVolume * 100).toString(10);

    if (this.getUserState().isGm()) {
      const preventContainer: HTMLElement = this.view.container.querySelector(
        ".gm-only"
      ) as HTMLElement;
      preventContainer.classList.remove("d-none");

      const prevent: HTMLInputElement =
        preventContainer.querySelector("#disable-sound");

      prevent.addEventListener("change", (e) => {
        this.getPersistedState().set("soundprevent", prevent.checked);

        this.getClient().send("sound", "prevent", {
          prevented: prevent.checked,
        });
      });

      prevent.checked = this.getPersistedState().get("soundprevent", false);

      if (prevent.checked) {
        this.getClient().send("sound", "prevent", {
          prevented: prevent.checked,
        });
      }
    }
  }

  protected loadScripts() {
    if (this.isScriptLoaded) {
      return;
    }

    const lame: HTMLScriptElement = document.createElement("script");
    lame.src = window["scriptPaths"].lame;

    const tuna: HTMLScriptElement = document.createElement("script");
    tuna.src = window["scriptPaths"].tuna;

    document.head.appendChild(lame);
    document.head.appendChild(tuna);
  }

  protected openLibrary() {
    this.loadScripts();

    const popin: Popin = this.getPopinManager().create({
      id: "sound-library",
      title: this.__("Sound Library"),
      html: Template.render("sound/library.html.njk"),
      width: 700,
      canDock: false,
    });

    popin.on("init", () => {
      popin
        .getElement()
        .querySelector(".record-btn")
        .addEventListener("click", (e) => {
          e.preventDefault();
          this.openRecording(popin);
        });

      popin
        .getElement()
        .querySelector(".explore-btn")
        .addEventListener("click", (e) => {
          e.preventDefault();
          this.openExplore(popin);
        });

      popin
        .getElement()
        .querySelector(".playlist-btn")
        .addEventListener("click", (e) => {
          e.preventDefault();
          this.openCreate(popin);
        });

      this.loadPlaylists(popin);
      this.openExplore(popin);
    });

    popin.open();
  }

  protected openExplore(popin: Popin) {
    const container: HTMLElement = popin
      .getElement()
      .querySelector(".sound-container");

    this.getClient().get("sound", "explore", {}, (response) => {
      const html: string = Template.render("sound/explore.html.njk", response);

      container.innerHTML = html;

      const search: HTMLInputElement = container.querySelector(
        'input[type="search"]'
      );
      let searchTimeout;

      container
        .querySelectorAll(".sound-category")
        .forEach((category: HTMLElement) => {
          category.addEventListener("click", (e) => {
            e.preventDefault();

            const cid: string = category.dataset.id;

            if (cid == "recording") {
              this.openRecordings(popin);
              return;
            }

            const id: number = parseInt(cid, 10);
            this.openCategory(id, popin);
          });
        });

      search.addEventListener("keyup", (e) => {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
          let q: string = search.value;
          q = q.trim();

          if (q == "") {
            container.querySelector(".search-result").innerHTML = "";
            return;
          }

          this.getClient().get(
            "sound",
            "search",
            {
              q: q,
            },
            (response) => {
              if (response.sounds.length == 0) {
                response.empty = true;
              }

              const html: string = Template.render(
                "sound/search.html.njk",
                response
              );

              container.querySelector(".search-result").innerHTML = html;

              popin.onHtmlUpdate();

              this.initSoundList(
                popin.getElement().querySelector(".sound-container")
              );
            }
          );
        }, 200);
      });
    });
  }

  protected openRecordings(popin: Popin) {
    const container: HTMLElement = popin
      .getElement()
      .querySelector(".sound-container");
    const page = 1;

    const load = () => {
      this.getClient().get(
        "sound",
        "loadRecordings",
        {
          p: page,
        },
        (response) => {
          response.hasPagination = response.prev || response.next;
          response.prevPage = response.page - 1;
          response.nextPage = response.page + 1;

          container.innerHTML = Template.render(
            "sound/recordings.html.njk",
            response
          );

          container
            .querySelector(".go-back-btn")
            .addEventListener("click", (e) => {
              e.preventDefault();

              this.openExplore(popin);
            });

          container
            .querySelectorAll(".delete-btn")
            .forEach((deleteBtn: HTMLElement) => {
              deleteBtn.addEventListener("click", (e) => {
                e.preventDefault();

                const entry: HTMLElement = deleteBtn.closest(
                  ".sound-entry"
                ) as HTMLElement;
                const id = parseInt(entry.dataset.id, 10);

                if (
                  confirm(
                    this.__("Are you sure you want to delete this recording?")
                  )
                ) {
                  this.getClient().get(
                    "sound",
                    "deleteRecording",
                    {
                      id: id,
                    },
                    () => {
                      this.openRecordings(popin);
                    }
                  );
                }
              });
            });

          container
            .querySelectorAll(".rename-btn")
            .forEach((renameBtn: HTMLElement) => {
              renameBtn.addEventListener("click", (e) => {
                e.preventDefault();

                const entry: HTMLElement = renameBtn.closest(
                  ".sound-entry"
                ) as HTMLElement;
                const id = parseInt(entry.dataset.id, 10);
                const title: HTMLElement = entry.querySelector(".title");

                const oldTitle: string = title.innerText;

                const input: HTMLInputElement = document.createElement("input");
                input.type = "text";
                input.classList.add("form-control");
                input.value = oldTitle;

                title.innerHTML = "";
                title.append(input);

                input.addEventListener("keyup", (e) => {
                  if (e.key === "Enter") {
                    let newTitle: string = input.value;
                    newTitle = newTitle.trim();

                    if (newTitle == "") {
                      newTitle = oldTitle;
                    }

                    title.innerText = newTitle;

                    this.getClient().get(
                      "sound",
                      "renameRecording",
                      {
                        id: id,
                        title: newTitle,
                      },
                      () => {
                        return;
                      }
                    );
                  }
                });

                input.focus();
              });
            });

          popin.onHtmlUpdate();

          this.initSoundList(
            popin.getElement().querySelector(".sound-container")
          );
        }
      );
    };

    load();
  }

  protected openCategory(id: number, popin: Popin) {
    const container: HTMLElement = popin
      .getElement()
      .querySelector(".sound-container");
    let page = 1;

    const load = () => {
      this.getSoundPlayer().stopAll();

      this.getClient().get(
        "sound",
        "category",
        {
          id: id,
          p: page,
        },
        (response) => {
          response.hasPagination = response.prev || response.next;
          response.prevPage = response.page - 1;
          response.nextPage = response.page + 1;

          container.innerHTML = Template.render(
            "sound/category.html.njk",
            response
          );

          container
            .querySelectorAll(".page-link")
            .forEach((pageLink: HTMLAnchorElement) => {
              pageLink.addEventListener("click", (e) => {
                e.preventDefault();
                page = parseInt(pageLink.dataset.page, 10);
                load();
              });
            });

          container
            .querySelector(".go-back-btn")
            .addEventListener("click", (e) => {
              e.preventDefault();
              this.openExplore(popin);
            });

          popin.onHtmlUpdate();

          this.initSoundList(
            popin.getElement().querySelector(".sound-container")
          );
        }
      );
    };

    load();
  }

  protected reloadSelect() {
    const playlistSelect: HTMLSelectElement = this.view.container.querySelector(
      ".playlist-select"
    ) as HTMLSelectElement;

    this.getClient().get("sound", "loadPlaylists", {}, (response) => {
      playlistSelect.innerHTML = Template.render(
        "sound/playlist-select.html.njk",
        response
      );
    });
  }

  protected loadPlaylists(popin: Popin) {
    const list: HTMLElement = popin
      .getElement()
      .querySelector(".playlist-list");

    this.getClient().get("sound", "loadPlaylists", {}, (response) => {
      list.innerHTML = Template.render(
        "sound/playlist-list.html.njk",
        response
      );

      list
        .querySelectorAll(".playlist-entry")
        .forEach((playlist: HTMLElement) => {
          const pid: number = parseInt(playlist.dataset.id, 10);

          playlist.addEventListener("click", (e) => {
            e.preventDefault();

            this.loadPlaylist(pid, popin);
          });

          playlist.addEventListener("dragover", (e) => {
            e.preventDefault();
          });

          playlist.addEventListener("dragenter", (e) => {
            playlist.classList.add("drop");
          });

          playlist.addEventListener("dragleave", (e) => {
            playlist.classList.remove("drop");
          });

          playlist.addEventListener("drop", (e) => {
            e.preventDefault();
            playlist.classList.remove("drop");

            const id: number = parseInt(e.dataTransfer.getData("id"), 10);
            const type: string = e.dataTransfer.getData("subtype");

            if (type === "sfx") {
              this.getClient().send("sound", "addSound", {
                pid: pid,
                id: id,
              });
            } else {
              this.getClient().send("sound", "addRecording", {
                pid: pid,
                id: id,
              });
            }

            playlist.classList.add("added");

            setTimeout(() => {
              playlist.classList.remove("added");
            }, 300);
          });
        });
    });
  }

  protected loadPlaylist(pid: number, popin: Popin) {
    const container: HTMLElement = popin
      .getElement()
      .querySelector(".sound-container");

    this.getClient().get(
      "sound",
      "loadPlaylist",
      {
        pid: pid,
      },
      (response) => {
        container.innerHTML = Template.render(
          "sound/playlist.html.njk",
          response
        );
        popin.onHtmlUpdate();

        this.initSoundList(
          popin.getElement().querySelector(".sound-container")
        );

        container
          .querySelector(".delete-playlist-btn")
          .addEventListener("click", (e) => {
            e.preventDefault();

            if (
              confirm(this.__("Are you sure you want to delete this playlist?"))
            ) {
              this.getClient().get(
                "sound",
                "deletePlaylist",
                {
                  pid: pid,
                },
                () => {
                  this.openExplore(popin);
                  this.loadPlaylists(popin);
                  this.reloadSelect();
                }
              );
            }
          });

        container
          .querySelector(".rename-playlist-btn")
          .addEventListener("click", (e) => {
            e.preventDefault();

            const title: HTMLElement = container.querySelector("h2");
            const renameInput: HTMLInputElement =
              document.createElement("input");
            renameInput.type = "text";
            renameInput.classList.add("form-control");
            renameInput.classList.add("form-control-lg");
            renameInput.value = response.playlist.title;

            renameInput.addEventListener("keyup", (e) => {
              let name: string = renameInput.value;
              name = name.trim();

              if (name == "") {
                return;
              }

              if (e.key === "Enter") {
                this.getClient().get(
                  "sound",
                  "renamePlaylist",
                  {
                    title: name,
                    pid: pid,
                  },
                  () => {
                    this.loadPlaylist(pid, popin);
                    this.reloadSelect();
                    this.loadPlaylists(popin);
                  }
                );
              }
            });

            title.innerText = "";
            title.append(renameInput);

            renameInput.focus();
          });

        container
          .querySelectorAll(".rename-btn")
          .forEach((renameBtn: HTMLElement) => {
            renameBtn.addEventListener("click", (e) => {
              e.preventDefault();
              const entry: HTMLElement = renameBtn.closest(
                ".sound-entry"
              ) as HTMLElement;
              const localId = parseInt(entry.dataset.localId, 10);
              const title: HTMLElement = entry.querySelector(".title");
              const oldTitle: string = title.innerText;

              const input: HTMLInputElement = document.createElement("input");
              input.type = "text";
              input.classList.add("form-control");
              input.value = oldTitle;

              title.innerHTML = "";
              title.append(input);

              input.addEventListener("keyup", (e) => {
                if (e.key === "Enter") {
                  let newTitle: string = input.value;
                  newTitle = newTitle.trim();

                  if (newTitle == "") {
                    newTitle = oldTitle;
                  }

                  title.innerText = newTitle;

                  this.getClient().get(
                    "sound",
                    "renamePlaylistItem",
                    {
                      pid: pid,
                      localId: localId,
                      title: newTitle,
                    },
                    () => {
                      return;
                    }
                  );
                }
              });

              input.focus();
            });
          });

        container
          .querySelectorAll(".remove-btn")
          .forEach((removeBtn: HTMLElement) => {
            removeBtn.addEventListener("click", (e) => {
              e.preventDefault();
              const entry: HTMLElement = removeBtn.closest(
                ".sound-entry"
              ) as HTMLElement;
              const localId = parseInt(entry.dataset.localId, 10);

              this.getClient().send("sound", "removePlaylistItem", {
                pid: pid,
                localId: localId,
              });

              entry.remove();
            });
          });
      }
    );
  }

  protected openCreate(popin: Popin) {
    const container: HTMLElement = popin
      .getElement()
      .querySelector(".sound-container");

    container.innerHTML = Template.render("sound/new-playlist.html.njk");

    const form: HTMLFormElement = container.querySelector(".create-form");

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const input: HTMLInputElement = container.querySelector(
        ".playlist-name"
      ) as HTMLInputElement;
      let title = input.value;
      title = title.trim();

      if (title == "") {
        return;
      }

      input.value = "";

      form.querySelector(".text-success").classList.remove("d-none");

      setTimeout(() => {
        form.querySelector(".text-success").classList.add("d-none");
      }, 2500);

      this.getClient().get(
        "sound",
        "createPlaylist",
        {
          title: title,
        },
        () => {
          this.loadPlaylists(popin);
          this.reloadSelect();
        }
      );
    });
  }

  protected initSoundList(container: HTMLElement) {
    container.querySelectorAll(".sound-entry").forEach((entry: HTMLElement) => {
      const id: number = parseInt(entry.dataset.id, 10);
      const path: string = entry.dataset.path;
      const btn: HTMLAnchorElement = entry.querySelector(".play-btn");

      let audio: HTMLAudioElement;

      btn.addEventListener("click", (e) => {
        e.preventDefault();

        if (btn.classList.contains("playing")) {
          btn.classList.remove("playing");
          this.getSoundPlayer().dispatchStop(audio.dataset.key);
          audio = null;
          return;
        }

        this.getSoundPlayer()
          .dispatch(path, (audio: HTMLAudioElement) => {
            btn.classList.remove("playing");
          })
          .then((_audio: HTMLAudioElement) => {
            audio = _audio;
          });

        btn.classList.add("playing");
      });

      entry.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("type", "sound");
        e.dataTransfer.setData("subtype", entry.dataset.type);
        e.dataTransfer.setData("id", id.toString(10));
        e.dataTransfer.setData("path", entry.dataset.path);
      });
    });
  }

  protected openRecording(popin: Popin) {
    popin.getElement().querySelector(".sound-container").innerHTML =
      Template.render("sound/record.html.njk", {
        transformers: this.getSoundTransformers().all(),
      });

    const startBtn: HTMLElement = popin
      .getElement()
      .querySelector(".start-record-btn");
    const stopBtn: HTMLElement = popin
      .getElement()
      .querySelector(".stop-recording-btn");
    const transformerContainer = popin
      .getElement()
      .querySelector(".transformers-container");
    const playTransformation: HTMLElement = popin
      .getElement()
      .querySelector(".play-transformation-btn");
    const transformers: HTMLSelectElement = popin
      .getElement()
      .querySelector(".transformers");
    const saveBtn: HTMLElement = popin.getElement().querySelector(".save-btn");
    const saving: HTMLElement = popin.getElement().querySelector(".saving");
    const saved: HTMLElement = popin.getElement().querySelector(".saved");
    const saveContainer: HTMLElement = popin
      .getElement()
      .querySelector(".save-container");
    const nameInput: HTMLInputElement = popin
      .getElement()
      .querySelector(".recording-name");

    let context: AudioContext;
    let shouldStop = false;
    let stopped = false;
    let mediaRecorder: any;

    let originalBuffer: AudioBuffer;
    let transformedBuffer: AudioBuffer;

    let timeout;

    startBtn.addEventListener("click", (e) => {
      e.preventDefault();

      context = null;
      shouldStop = false;
      stopped = false;
      mediaRecorder = null;
      originalBuffer = null;
      transformedBuffer = null;

      const handleSuccess = (stream) => {
        startBtn.classList.add("d-none");
        stopBtn.classList.remove("d-none");

        mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm",
        });

        const recordedChunks = [];

        const onData = function (e) {
          if (e.data.size > 0) {
            recordedChunks.push(e.data);
          }

          if (shouldStop === true && stopped === false) {
            if (mediaRecorder.state === "recording") {
              mediaRecorder.stop();
            }

            stopped = true;
            mediaRecorder.removeEventListener("dataavailable", onData);
          }
        };

        mediaRecorder.addEventListener("dataavailable", onData);

        mediaRecorder.addEventListener("stop", function () {
          stream.getTracks().forEach((track) => track.stop());

          context = new AudioContext();
          const blob = new Blob(recordedChunks, { type: "audio/webm" });
          const fileReader = new FileReader();

          fileReader.onloadend = () => {
            const arrayBuffer = fileReader.result as ArrayBuffer;

            context.decodeAudioData(arrayBuffer, (audioBuffer) => {
              originalBuffer = audioBuffer;

              startBtn.classList.remove("d-none");
              stopBtn.classList.add("d-none");
              transformerContainer.classList.remove("d-none");
              saveContainer.classList.remove("d-none");
              saveBtn.classList.remove("d-none");
            });
          };

          fileReader.readAsArrayBuffer(blob);
        });

        clearTimeout(timeout);

        timeout = setTimeout(() => {
          mediaRecorder.stop();
        }, 120000);

        mediaRecorder.start();

        transformerContainer.classList.add("d-none");
        saveBtn.classList.add("d-none");
      };

      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then(handleSuccess);
    });

    stopBtn.addEventListener("click", (e) => {
      e.preventDefault();

      startBtn.classList.remove("d-none");
      stopBtn.classList.add("d-none");

      shouldStop = true;
      mediaRecorder.stop();
    });

    let isPlaying = false;
    let source: AudioBufferSourceNode;

    const stopPlay = () => {
      playTransformation.querySelector(".fa-play").classList.remove("d-none");
      playTransformation.querySelector(".fa-spin").classList.add("d-none");
      playTransformation.querySelector(".fa-stop").classList.add("d-none");

      isPlaying = false;
    };

    playTransformation.addEventListener("click", (e) => {
      e.preventDefault();

      if (isPlaying) {
        source.stop();
        stopPlay();

        return;
      }

      const key: string = transformers.value;
      const transformer: AudioTransformer =
        this.getSoundTransformers().getInstance(key);

      playTransformation.querySelector(".fa-spin").classList.remove("d-none");
      playTransformation.querySelector(".fa-play").classList.add("d-none");

      transformer.transform(originalBuffer).then((newBuffer) => {
        transformedBuffer = newBuffer;

        source = context.createBufferSource();
        source.buffer = transformedBuffer;
        source.connect(context.destination);
        source.start();

        isPlaying = true;

        playTransformation.querySelector(".fa-spin").classList.add("d-none");
        playTransformation.querySelector(".fa-stop").classList.remove("d-none");

        source.addEventListener("ended", () => {
          stopPlay();
        });
      });
    });

    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();

      saveContainer.classList.add("d-none");
      saveBtn.classList.add("d-none");
      saving.classList.remove("d-none");

      const encoder = new WavEncoder();
      let myBuffer: AudioBuffer;

      if (source) {
        myBuffer = source.buffer;
      } else {
        myBuffer = originalBuffer;
      }

      const wav = encoder.audioBufferToWav(myBuffer, {});

      const lamejs: any = window["lamejs"];

      const channels = 1; //1 for mono or 2 for stereo
      const sampleRate = 44100; //44.1khz (normal mp3 samplerate)
      const kbps = 128; //encode 128kbps mp3
      const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
      const samples = new Int16Array(wav);
      const sampleBlockSize = 1152; //can be anything but make it a multiple of 576 to make encoders life easier

      const mp3Data = [];
      for (let i = 0; i < samples.length; i += sampleBlockSize) {
        const sampleChunk = samples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);

        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }

      const mp3buf = mp3encoder.flush(); //finish writing mp3

      if (mp3buf.length > 0) {
        mp3Data.push(new Int8Array(mp3buf));
      }

      const blob = new Blob(mp3Data, { type: "audio/mp3" });

      upload(blob);
    });

    const getTitle = () => {
      let title: string = nameInput.value;

      title = title.trim();

      if (title == "") {
        return this.__("Untitled recording");
      }

      return title;
    };

    const upload = (blob: Blob) => {
      const formData = new FormData();

      const title: string = getTitle();

      formData.append("media[]", blob, "recorded-sound.mp3");
      formData.append("type", "recording");
      formData.append("title", title);

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

        if (response.length > 0) {
          const id: string = response[0].id;

          this.getClient().send("sound", "createRecording", {
            media_id: id,
            name: title,
          });
        }

        saving.classList.add("d-none");
        saveBtn.classList.remove("d-none");
        saveContainer.classList.remove("d-none");
        saved.classList.remove("d-none");

        setTimeout(() => {
          saved.classList.add("d-none");
        }, 3000);
      });
    };
  }

  protected getSoundTransformers(): Transformers {
    return container.get<Transformers>(Services.SoundTransformers);
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getSoundPlayer(): SoundPlayer {
    return container.get<SoundPlayer>(Services.SoundPlayer);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getPersistedState(): PersistedState {
    return container.get<PersistedState>(States.Persisted);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }
}
