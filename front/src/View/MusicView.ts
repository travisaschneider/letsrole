import { View } from "./View";
import { injectable } from "inversify";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { Template } from "./Template";
import { MenuView } from "./MenuView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import { MusicProvider } from "../../shared/MusicData";
import { PopinManager } from "./Popin/PopinManager";
import { Services } from "../DependencyInjection/Services";
import { Popin } from "./Popin/Popin";
import { UserState } from "../State/UserState";
import { States } from "../DependencyInjection/State";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { DockableView, ViewOpenMode } from "./DockableView";
import { SoundView } from "./SoundView";
import { ArrayUtil } from "shared/Util/ArrayUtil";

enum YoutubeStatus {
  Idle = "idle",
  Initialized = "initialized",
  Loaded = "loaded",
}

enum PlayerState {
  Playing = "playing",
  Paused = "paused",
}

enum RepeatMode {
  None = "none",
  All = "all",
  Current = "current",
}

enum ShuffleState {
  Off = 0,
  On = 1,
}

interface MusicState {
  provider: MusicProvider;
  providerId: string;
  volume: number;
  isPaused: boolean;
  isActive: boolean;
  position: number;
}

@injectable()
export class MusicView extends View {
  public static readonly DefaultVolume: number = 50;

  protected view: DockableView;
  protected container: HTMLElement;
  protected taskBarItem: TaskBarItem;
  protected youtubeStatus: YoutubeStatus = YoutubeStatus.Idle;
  protected youtubeCallbacks: Function[] = [];
  protected player: YT.Player;
  protected playerContainer: HTMLElement;
  protected playerState: PlayerState = PlayerState.Paused;
  protected repeatMode: RepeatMode = RepeatMode.None;
  protected shuffleState: ShuffleState = ShuffleState.Off;
  protected timeRefresher: ReturnType<typeof setInterval>;

  protected currentPlaylist: any = null;
  protected queue: any[] = [];
  protected queueIndex = 0;
  protected shuffledIndexes: number[] = [];
  protected state: MusicState = {
    isActive: false,
    isPaused: false,
    provider: null,
    providerId: null,
    position: 0,
    volume: MusicView.DefaultVolume,
  };

  public init() {
    super.init();
    this.initQuickView();
  }

  public execute(callback: Function) {
    if (
      this.youtubeStatus === YoutubeStatus.Idle ||
      this.youtubeStatus === YoutubeStatus.Initialized
    ) {
      this.youtubeCallbacks.push(callback);
    }

    if (this.youtubeStatus === YoutubeStatus.Loaded) {
      callback();
      return;
    }

    if (this.youtubeStatus === YoutubeStatus.Idle) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";

      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      this.youtubeStatus = YoutubeStatus.Initialized;

      window["onYouTubeIframeAPIReady"] = () => {
        this.playerContainer.classList.remove("d-none");

        this.player = new YT.Player(this.playerContainer, {
          height: 200,
          width: "100%",
          playerVars: {
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            showinfo: 0,
          },
          events: {
            onReady: () => {
              this.youtubeStatus = YoutubeStatus.Loaded;

              this.youtubeCallbacks.forEach((callback: Function) => {
                callback();
              });
            },
            onError: (e) => {
              if (this.getUserState().isGm()) {
                this.playNextInPlaylist();
              }
            },
            onStateChange: (e) => {
              if (!this.getUserState().isGm()) {
                return;
              }

              if (e.data === YT.PlayerState.ENDED) {
                this.playNextInPlaylist();
                return;
              }

              if (e.data === 1) {
                if (this.playerState === PlayerState.Paused) {
                  this.getClient().send("music", "resume");
                  this.playerState = PlayerState.Playing;
                  this.state.isPaused = false;
                  this.updateControls();
                  this.updateState();
                }
                return;
              }

              if (e.data === 2) {
                if (this.playerState === PlayerState.Playing) {
                  this.getClient().send("music", "pause");
                  this.playerState = PlayerState.Paused;
                  this.state.isPaused = true;
                  this.updateControls();
                  this.updateState();
                }
                return;
              }
            },
          },
        });
      };
    }
  }

  public pause() {
    this.execute(() => {
      if (this.playerState === PlayerState.Playing) {
        this.player.pauseVideo();
        this.playerState = PlayerState.Paused;
        this.state.isPaused = true;
        this.updateControls();
        this.updateState();
      }
    });
  }

  public resume() {
    this.execute(() => {
      if (this.playerState === PlayerState.Paused) {
        this.player.playVideo();
        this.playerState = PlayerState.Playing;
        this.state.isPaused = false;
        this.updateControls();
        this.updateState();
      }
    });
  }

  protected updateState() {
    if (!this.getUserState().isGm()) {
      return;
    }

    if (this.state.providerId) {
      this.getClient().send("music", "sync", this.state);
    }
  }

  protected updateControls() {
    if (!this.getUserState().isGm()) {
      return;
    }

    const controlContainer: HTMLDivElement =
      this.container.querySelector(".controls");
    const classList = controlContainer.classList;

    if (this.playerState === PlayerState.Playing) {
      classList.add("playing");
      classList.remove("paused");
    } else {
      classList.remove("playing");
      classList.add("paused");
    }

    if (!this.currentPlaylist) {
      classList.add("no-flow");
    } else {
      classList.remove("no-flow");
    }
  }

  protected updatePlayMode() {
    const repeatIcon: HTMLAnchorElement =
      this.container.querySelector(".repeat-btn i");
    const shuffleIcon: HTMLAnchorElement =
      this.container.querySelector(".shuffle-btn i");

    let classToSet: Array<string> = ["fa-repeat"];
    let classToUnset: Array<string> = ["activated", "fa-repeat-1"];

    if (this.repeatMode === RepeatMode.Current) {
      classToSet = ["activated", "fa-repeat-1"];
      classToUnset = ["fa-repeat"];
    } else if (this.repeatMode === RepeatMode.All) {
      classToSet = ["activated", "fa-repeat"];
      classToUnset = ["fa-repeat-1"];
    }

    const classList = repeatIcon.classList;
    // eslint-disable-next-line prefer-spread
    classList.add.apply(classList, classToSet);
    // eslint-disable-next-line prefer-spread
    classList.remove.apply(classList, classToUnset);

    if (this.shuffleState === ShuffleState.On) {
      shuffleIcon.classList.add("activated");
    } else {
      shuffleIcon.classList.remove("activated");
    }
  }

  protected initShufflingTracks(indexToKeep = -1) {
    if (this.queue.length > 0 && this.shuffleState === ShuffleState.On) {
      let allIndexes: number[] = Object.keys(this.queue).map((n) =>
        parseInt(n)
      );

      if (indexToKeep !== -1) {
        allIndexes = ArrayUtil.shuffle(
          allIndexes.filter((n) => n !== this.queueIndex)
        );
        this.shuffledIndexes = [this.queueIndex, ...allIndexes];
      } else {
        this.shuffledIndexes = ArrayUtil.shuffle(allIndexes);
      }

      this.queueIndex = 0;
    } else {
      if (this.shuffledIndexes.length > 0) {
        this.queueIndex = this.shuffledIndexes[this.queueIndex];
      }
      this.shuffledIndexes = [];
    }
  }

  protected stopTimeRefresh(): void {
    if (this.timeRefresher) {
      clearInterval(this.timeRefresher);
    }
  }

  protected startTimeRefresh(): void {
    this.stopTimeRefresh();
    const timeRefresh = () => {
      if (!this.player) {
        return;
      }

      try {
        const duration: number = this.player.getDuration();
        const current: number = this.player.getCurrentTime();
        let percent: number;

        if (duration == 0 || current == 0) {
          percent = 0;
          this.timelineSet(0, false);
        } else {
          // + 1 in order to sync the css animation of the timeline with the real video timecode
          percent = ((current + 1) / duration) * 100;
        }

        if (!percent) {
          percent = 0;
        }

        this.displayTimes(current, duration);
        this.timelineSet(percent, true);
      } catch (e) {
        //
      }
    };
    this.timeRefresher = setInterval(timeRefresh, 1000);
    timeRefresh();
  }

  protected static formatSecondToDuration(seconds: number): string {
    if (!seconds) return "";
    const h: number = Math.floor(seconds / 3600);
    const m: number = Math.floor((seconds % 3600) / 60);
    const s: number = Math.floor(seconds % 60);

    let result: string = h > 0 ? h.toString() + ":" : "";
    result += (h > 0 && m < 10 ? "0" : "") + m.toString() + ":";
    result += (s < 10 ? "0" : "") + s.toString();

    return result;
  }

  protected displayTimes(currentTime: number, duration: number): void {
    const currentTimeElement: HTMLSpanElement =
      this.container.querySelector(".current-time");
    const totalTimeElement: HTMLSpanElement =
      this.container.querySelector(".total-time");

    currentTimeElement.innerText =
      MusicView.formatSecondToDuration(currentTime);
    totalTimeElement.innerText = MusicView.formatSecondToDuration(duration);
  }

  public play(provider: MusicProvider, id: string) {
    if (provider !== MusicProvider.Youtube) {
      return;
    }

    this.execute(() => {
      this.player.loadVideoById(id);
      this.playerState = PlayerState.Playing;
      this.player.seekTo(0, true);
      this.player.playVideo();

      this.state.providerId = id;
      this.state.provider = MusicProvider.Youtube;
      this.state.position = 0;
      this.state.isPaused = false;
      this.state.isActive = true;

      this.updateControls();
      this.updateState();
      this.startTimeRefresh();
    });
  }

  protected publish(provider: MusicProvider, id: string) {
    this.getClient().send("music", "play", {
      provider: provider,
      id: id,
    });
  }

  public parseYoutubeUrl(url: string): string {
    // eslint-disable-next-line no-useless-escape
    const regExp =
      /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length == 11) {
      return match[2];
    }

    return null;
  }

  public parseYoutubePlaylistUrl(url: string): string {
    // eslint-disable-next-line no-useless-escape
    const regExp =
      /^.*(youtu\.be\/|v\/|u\/\w\/|playlist\?list=|\&v=)([^#\&\?]*).*/;

    const match = url.match(regExp);

    if (match && match[2]) {
      return match[2];
    }

    return null;
  }

  protected enable() {
    this.taskBarItem.activate();
    this.container.classList.add("active");
  }

  protected disable() {
    this.taskBarItem.desactivate();
    this.container.classList.remove("active");
  }

  public initialize(data: any) {
    if (!data.isActive) {
      return;
    }

    this.execute(() => {
      this.player.loadVideoById(data.providerId, data.position);

      if (data.isPaused) {
        this.player.pauseVideo();
        this.playerState = PlayerState.Paused;
      } else {
        this.player.playVideo();
        this.playerState = PlayerState.Playing;
      }
    });
  }

  public seek(position: number) {
    this.execute(() => {
      this.player.seekTo(position, true);
      const percent = Math.round((position / this.player.getDuration()) * 100);
      this.timelineSet(percent, false);

      this.state.position = position;
      this.updateState();
    });
  }

  public setVolume(volume: number) {
    this.execute(() => {
      this.player.setVolume(SoundView.transformVolume(volume));
      (
        this.container.querySelector(".volume-control") as HTMLInputElement
      ).value = volume.toString(10);
      this.saveVolume(volume);

      this.state.volume = volume;
      this.updateState();
    });
  }

  protected saveVolume(volume: number) {
    window.localStorage.setItem("musicVolume", volume.toString(10));
  }

  protected getDefaultVolume(): number {
    const volume: string = window.localStorage.getItem("musicVolume");

    if (!volume) {
      return MusicView.DefaultVolume;
    }

    return parseFloat(volume);
  }

  protected openManager() {
    const popin: Popin = this.getPopinManager().create({
      id: "music-manager",
      title: this.__("Music Manager"),
      html: Template.render("music/manager.html.njk"),
      canDock: false,
      canMinimize: false,
      height: 500,
    });

    let q: string = null;

    const createPlaylist = () => {
      const html: string = Template.render("music/playlist-create.html.njk");

      popin.getElement().querySelector(".create-container").innerHTML = html;
      const elt: HTMLElement = popin
        .getElement()
        .querySelector(".playlist-creator");

      elt.querySelector("input").focus();

      elt.querySelector(".save-btn").addEventListener("click", (e) => {
        e.preventDefault();

        this.getClient().get(
          "music",
          "createPlaylist",
          {
            title: (elt.querySelector('[name="title"]') as HTMLInputElement)
              .value,
          },
          () => {
            loadList();
          }
        );

        elt.remove();
      });

      elt.querySelector(".cancel-btn").addEventListener("click", (e) => {
        e.preventDefault();
        elt.remove();
      });
    };

    const displayPlaylist = (data: any) => {
      const playlist: any = data.playlist;

      popin.closeOver();

      const html: string = Template.render(
        "music/playlist-edit.html.njk",
        data
      );
      popin.displayOver(html);
      popin.onHtmlUpdate();

      const subContainer: HTMLElement = popin
        .getElement()
        .querySelector(".playlist-edit");
      const addInput: HTMLInputElement = subContainer.querySelector(
        ".add-input"
      ) as HTMLInputElement;
      const header: HTMLElement =
        subContainer.querySelector(".playlist-header");

      const searchIntoPlaylist = (query: string) => {
        const searchContainer: HTMLElement = popin
          .getElement()
          .querySelector("#search-result-container");

        const onLoad = () => {
          searchContainer
            .querySelectorAll(".add-song-btn")
            .forEach((addBtn: HTMLElement) => {
              addBtn.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();

                addToPlaylist(
                  addBtn.dataset.provider,
                  addBtn.dataset.providerId,
                  false
                );
              });
            });
        };

        search(query, searchContainer, onLoad, "playlist");
      };

      const submitSong = () => {
        const url: string = addInput.value;
        let id: string = this.parseYoutubeUrl(url);
        let isPlaylist = false;

        if (id == null) {
          id = this.parseYoutubePlaylistUrl(url);

          if (id == null) {
            searchIntoPlaylist(addInput.value);
            return;
          }

          isPlaylist = true;
        }

        addInput.value = "";
        subContainer.querySelector(".add-loading").classList.remove("d-none");

        addToPlaylist("youtube", id, isPlaylist);
      };

      const addToPlaylist = (
        provider: string,
        providerId: string,
        isPlaylist: boolean
      ) => {
        this.getClient().get(
          "music",
          "addToPlaylist",
          {
            id: playlist.id,
            provider: provider,
            providerId: providerId,
            playlist: isPlaylist,
          },
          (response) => {
            this.getClient().get(
              "music",
              "getPlaylist",
              { id: playlist.id },
              (response) => {
                displayPlaylist(response);
              }
            );
          }
        );
      };

      subContainer.querySelector(".back-btn").addEventListener("click", (e) => {
        e.preventDefault();
        popin.closeOver();
        loadList();
      });

      subContainer
        .querySelector(".delete-playlist-btn")
        .addEventListener("click", (e) => {
          const id: number = playlist.id;

          if (
            confirm(this.__("Are you sure you want to delete this playlist ?"))
          ) {
            this.getClient().get(
              "music",
              "deletePlaylist",
              { id: id },
              (response) => {
                popin.closeOver();
                loadList();
              }
            );
          }
        });

      subContainer
        .querySelector(".add-form")
        .addEventListener("submit", (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();

          submitSong();
        });

      subContainer
        .querySelector(".play-now-button")
        .addEventListener("click", (e) => {
          e.preventDefault();

          this.getClient().get(
            "music",
            "playPlaylist",
            { id: playlist.id },
            (response) => {
              this.startPlaylist(response);
            }
          );
        });

      subContainer
        .querySelector(".edit-name-btn")
        .addEventListener("click", (e) => {
          e.preventDefault();

          const input: HTMLInputElement = header.querySelector(
            ".rename-input"
          ) as HTMLInputElement;
          const renameContainer: HTMLElement =
            header.querySelector(".rename-container");

          input.value = playlist.title;

          header.querySelector("h2").classList.add("d-none");
          renameContainer.classList.remove("d-none");
          renameContainer.classList.add("d-flex");

          input.focus();
        });

      const hideRename = () => {
        const renameContainer: HTMLElement =
          header.querySelector(".rename-container");

        header.querySelector("h2").classList.remove("d-none");
        renameContainer.classList.add("d-none");
        renameContainer.classList.remove("d-flex");
      };

      subContainer
        .querySelector(".cancel-rename-btn")
        .addEventListener("click", (e) => {
          e.preventDefault();
          hideRename();
        });

      subContainer
        .querySelector(".save-rename-btn")
        .addEventListener("click", (e) => {
          e.preventDefault();

          const input: HTMLInputElement = header.querySelector(
            ".rename-input"
          ) as HTMLInputElement;
          hideRename();

          if (input.value == playlist.title) {
            return;
          }

          this.getClient().get(
            "music",
            "renamePlaylist",
            {
              id: playlist.id,
              title: input.value,
            },
            () => {
              this.getClient().get(
                "music",
                "getPlaylist",
                { id: playlist.id },
                (response) => {
                  displayPlaylist(response);
                }
              );
            }
          );
        });

      subContainer
        .querySelectorAll(".play-song-btn")
        .forEach((playBtn: HTMLAnchorElement) => {
          playBtn.addEventListener("click", (e) => {
            e.preventDefault();

            const provider: MusicProvider = playBtn.dataset
              .provider as MusicProvider;
            const id: string = playBtn.dataset.providerId;

            this.publish(provider, id);
          });
        });

      subContainer
        .querySelectorAll(".delete-btn")
        .forEach((deleteBtn: HTMLAnchorElement) => {
          deleteBtn.addEventListener("click", (e) => {
            e.preventDefault();

            const id: number = parseInt(deleteBtn.dataset.id, 10);

            this.getClient().get(
              "music",
              "deleteSong",
              {
                id: id,
                playlistId: playlist.id,
              },
              () => {
                this.getClient().get(
                  "music",
                  "getPlaylist",
                  { id: playlist.id },
                  (response) => {
                    displayPlaylist(response);
                  }
                );
              }
            );
          });
        });

      subContainer.querySelector(".add-btn").addEventListener("click", (e) => {
        submitSong();
      });

      subContainer
        .querySelector("#option-repeat")
        .addEventListener("click", (e: MouseEvent) => {
          this.getClient().send("music", "repeatPlaylist", {
            value: (e.target as HTMLInputElement).checked,
            id: playlist.id,
          });
        });

      subContainer
        .querySelector("#option-shuffle")
        .addEventListener("click", (e) => {
          this.getClient().get(
            "music",
            "shufflePlaylist",
            {
              value: (e.target as HTMLInputElement).checked,
              id: playlist.id,
            },
            () => {
              return;
            }
          );
        });

      subContainer.querySelectorAll(".song").forEach((song: HTMLElement) => {
        song.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("id", song.dataset.id);
          e.dataTransfer.setData("type", "song");
        });
      });

      const songsContainer: HTMLElement = subContainer.querySelector(".songs");

      const initDragDrop = () => {
        songsContainer
          .querySelectorAll(".song-dropper")
          .forEach((dropper: HTMLElement) => {
            if (dropper.classList.contains("initialized")) {
              return;
            }

            dropper.addEventListener("dragover", (e) => {
              e.preventDefault();
            });

            dropper.addEventListener("drop", (e) => {
              e.preventDefault();
              dropper.classList.remove("active");

              const id: string = e.dataTransfer.getData("id");
              const type: string = e.dataTransfer.getData("type");

              if (type != "song") {
                return;
              }

              const songElement: HTMLElement = songsContainer.querySelector(
                '.song[data-id="' + id + '"]'
              );

              if (!songElement) {
                return;
              }

              const previousDropper: HTMLElement =
                songElement.previousElementSibling as HTMLElement;

              if (previousDropper === dropper) {
                return;
              }

              if (previousDropper) {
                previousDropper.remove();
              }

              dropper.insertAdjacentHTML(
                "beforebegin",
                '<div class="song-dropper"></div>'
              );
              dropper.insertAdjacentElement("beforebegin", songElement);

              initDragDrop();

              let position = 0;
              const changes: any = {};
              let hasChanges = false;

              songsContainer
                .querySelectorAll(".song")
                .forEach((song: HTMLElement) => {
                  const songPosition: number = parseInt(
                    song.dataset.position,
                    10
                  );
                  const id: string = song.dataset.id;

                  if (songPosition != position) {
                    changes[id] = position;
                    hasChanges = true;

                    song.dataset.position = position.toString(10);
                  }

                  position++;
                });

              if (hasChanges) {
                this.getClient().send("music", "orderPlaylist", {
                  id: playlist.id,
                  changes: changes,
                });
              }
            });

            dropper.addEventListener("dragenter", (e) => {
              dropper.classList.add("active");
            });

            dropper.addEventListener("dragleave", (e) => {
              dropper.classList.remove("active");
            });

            dropper.classList.add("initialized");
          });
      };

      initDragDrop();
    };

    const loadList = () => {
      this.getClient().get(
        "music",
        "listPlaylist",
        {
          q: q,
        },
        (response) => {
          const html: string = Template.render("music/playlist-list.html.njk", {
            playlists: response.playlists,
          });

          this.updateAvailablePlaylists(response.playlists);

          popin.getElement().querySelector(".playlist-list").innerHTML = html;
          popin.onHtmlUpdate();

          popin
            .getElement()
            .querySelectorAll(".playlist")
            .forEach((item: HTMLElement) => {
              item.addEventListener("click", (e) => {
                const id: number = parseInt(item.dataset.id, 10);

                this.getClient().get(
                  "music",
                  "getPlaylist",
                  { id: id },
                  (response) => {
                    displayPlaylist(response);
                  }
                );
              });
            });

          popin
            .getElement()
            .querySelectorAll(".play-now-btn")
            .forEach((button: HTMLAnchorElement) => {
              button.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();

                const id: number = parseInt(button.dataset.id, 10);

                this.getClient().get(
                  "music",
                  "playPlaylist",
                  { id: id },
                  (response) => {
                    this.startPlaylist(response);
                  }
                );
              });
            });
        }
      );
    };

    const search = (
      query: string,
      container: HTMLElement,
      cb: Function = null,
      mode = "play"
    ) => {
      this.getClient().get(
        "music",
        "search",
        {
          q: query,
        },
        (response) => {
          const html: string = Template.render("music/partner-songs.html.njk", {
            songs: response.songs,
            mode: mode,
          });

          container.innerHTML = html;

          jQuery(container).find(".play-song-btn, .add-song-btn").tooltip();

          container
            .querySelectorAll(".play-song-btn")
            .forEach((playBtn: HTMLElement) => {
              playBtn.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();

                this.publish(
                  playBtn.dataset.provider as MusicProvider,
                  playBtn.dataset.providerId
                );
              });
            });

          if (cb) {
            cb();
          }
        }
      );
    };

    popin.on("init", () => {
      const searchInput: HTMLInputElement = popin
        .getElement()
        .querySelector(".search-input") as HTMLInputElement;

      popin
        .getElement()
        .querySelector(".create-playlist-btn")
        .addEventListener("click", (e) => {
          e.preventDefault();
          createPlaylist();
        });

      let searchTimeout;

      searchInput.addEventListener("keyup", (e) => {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
          q = searchInput.value;
          q = q.trim();

          const resContainer: HTMLElement = popin
            .getElement()
            .querySelector("#partner-songs-container");

          if (q == "") {
            resContainer.innerHTML = "";
            return;
          }

          search(q, resContainer);
        }, 300);
      });

      loadList();
    });

    popin.open();
  }

  public startPlaylist(response: any) {
    const playlist = response.playlist;
    const songs: any[] = response.songs;

    if (songs.length < 1) {
      return;
    }

    this.currentPlaylist = playlist;
    this.queue = songs;
    this.queueIndex = 0;

    if (playlist.repeat) {
      this.repeatMode = RepeatMode.All;
    } else {
      this.repeatMode = RepeatMode.None;
    }

    if (playlist.shuffle) {
      this.shuffleState = ShuffleState.On;
      this.initShufflingTracks();
    } else {
      this.shuffleState = ShuffleState.Off;
    }
    this.updatePlayMode();

    this.playPlaylist();
  }

  protected playPlaylist() {
    if (this.queue.length < 1) {
      return;
    }

    let index = this.queueIndex;

    if (this.shuffleState === ShuffleState.On) {
      if (index >= this.shuffledIndexes.length) {
        return;
      }
      index = this.shuffledIndexes[index];
    }

    if (!this.queue[index]) {
      return;
    }

    const song: any = this.queue[index];

    this.timelineSet(0, false);
    this.publish(song.provider, song.providerId);
  }

  protected playNextInPlaylist() {
    if (!this.currentPlaylist && this.repeatMode !== RepeatMode.None) {
      // Repeat current track played with "quick play" button
      this.publish(this.state.provider, this.state.providerId);
      return;
    } else if (
      this.repeatMode === RepeatMode.None &&
      this.queueIndex >= this.queue.length - 1
    ) {
      // End of playlist
      return;
    } else if (this.repeatMode !== RepeatMode.Current) {
      this.queueIndex++;
    }

    if (
      this.repeatMode === RepeatMode.All &&
      this.queueIndex >= this.queue.length
    ) {
      this.queueIndex = 0;

      if (this.shuffleState === ShuffleState.On) {
        this.initShufflingTracks();
      }
    }

    this.playPlaylist();
  }

  protected playPrevInPlaylist() {
    if (this.repeatMode === RepeatMode.None && this.queueIndex <= 0) {
      return;
    } else if (this.repeatMode !== RepeatMode.Current) {
      this.queueIndex--;
    }

    if (this.repeatMode === RepeatMode.All && this.queueIndex <= 0) {
      this.queueIndex = this.queue.length - 1;

      if (this.shuffleState === ShuffleState.On) {
        this.initShufflingTracks();
      }
    }

    this.playPlaylist();
  }

  public updateAvailablePlaylists(playlists: any[]) {
    const select: HTMLSelectElement =
      this.container.querySelector(".quick-playlist");

    select.querySelectorAll("option").forEach((option: HTMLOptionElement) => {
      if (!option.classList.contains("fixed")) {
        option.remove();
      }
    });

    playlists.forEach((playlist: any) => {
      const option: HTMLOptionElement = document.createElement("option");
      option.value = playlist.id;
      option.innerText = playlist.title;
      select.add(option);
    });
  }

  protected initQuickView() {
    this.taskBarItem = new TaskBarItem(
      this.__("Music"),
      "fas fa-music",
      TaskBarCategory.Audio
    );
    this.getTaskBarView().add(this.taskBarItem);

    this.view = new DockableView({
      id: "music",
      title: this.__("Music"),
      html: this.__("Loading..."),
      mode: ViewOpenMode.DockRight,
      icon: "fas fa-music",
      taskBarItem: this.taskBarItem,
      defaultConfiguration: {
        index: 8,
        hidden: false,
        minimized: true,
        mode: ViewOpenMode.DockRight,
      },
    });

    this.getUi().register(this.view);

    EventDispatcher.on(Events.USER_ME_LOADED, () => {
      this.updateQuickView();
    });
  }

  protected timelineSet(percent: number, animated = true): void {
    const seek: HTMLElement = this.container.querySelector(".progress-bar");
    const percentCss = percent.toString(10) + "%";

    if (animated) {
      seek.style.width = percentCss;
    } else {
      seek.classList.remove("playing");
      seek.style.width = percentCss;
      seek.offsetHeight; // This force the layout reflow so that css changes are immediately applied
      seek.classList.add("playing");
    }
  }

  protected updateQuickView() {
    this.container = this.view.container;

    this.container.innerHTML = Template.render("music/quick-view.html.njk", {
      isGm: this.getUserState().isGm(),
    });

    let updateVolumeTimeout;

    const quickInput: HTMLInputElement = this.container.querySelector(
      ".quick-play-input"
    ) as HTMLInputElement;
    const volumeInput: HTMLInputElement = this.container.querySelector(
      ".volume-control"
    ) as HTMLInputElement;
    const quickPlaylist: HTMLSelectElement =
      this.container.querySelector(".quick-playlist");
    const playBtn = this.container.querySelector(".play-btn");
    const pauseBtn = this.container.querySelector(".pause-btn");
    const repeatBtn = this.container.querySelector(".repeat-btn");
    const shuffleBtn = this.container.querySelector(".shuffle-btn");
    const nextBtn = this.container.querySelector(".next-btn");
    const prevBtn = this.container.querySelector(".prev-btn");
    const volumeBtn = this.container.querySelector(".volume-btn");
    const managerBtn = this.container.querySelector(".manager-btn");
    const quickPlayBtn = this.container.querySelector(".quick-play-btn");

    if (quickPlayBtn) {
      quickPlayBtn.addEventListener("click", (e) => {
        e.preventDefault();

        quickInput.classList.remove("is-invalid");

        const url: string = quickInput.value;
        const id: string = this.parseYoutubeUrl(url);

        if (id === null) {
          quickInput.classList.add("is-invalid");
          return;
        }

        this.currentPlaylist = null;
        this.queueIndex = 0;
        this.queue = [];

        this.publish(MusicProvider.Youtube, id);
      });
    }

    if (volumeBtn) {
      volumeBtn.addEventListener("click", (e) => {
        const volumeContainer =
          this.container.querySelector(".volume-container");

        if (volumeContainer.classList.contains("d-none")) {
          volumeContainer.classList.remove("d-none");
          volumeBtn.classList.add("activated");
        } else {
          volumeContainer.classList.add("d-none");
          volumeBtn.classList.remove("activated");
        }
      });
    }

    if (playBtn) {
      playBtn.addEventListener("click", (e) => {
        if (
          this.shuffleState === ShuffleState.On &&
          this.shuffledIndexes.length === 0
        ) {
          this.initShufflingTracks(this.queueIndex);
        }
        this.getClient().send("music", "resume");
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener("click", (e) => {
        this.getClient().send("music", "pause");
      });
    }

    if (repeatBtn) {
      repeatBtn.addEventListener("click", (e) => {
        if (this.repeatMode === RepeatMode.None) {
          this.repeatMode = RepeatMode.All;
        } else if (this.repeatMode === RepeatMode.All) {
          this.repeatMode = RepeatMode.Current;
        } else if (this.repeatMode === RepeatMode.Current) {
          this.repeatMode = RepeatMode.None;
        }
        this.updatePlayMode();
      });
    }

    if (shuffleBtn) {
      shuffleBtn.addEventListener("click", (e) => {
        if (this.shuffleState === ShuffleState.Off) {
          this.shuffleState = ShuffleState.On;
        } else {
          this.shuffleState = ShuffleState.Off;
        }
        if (this.playerState === PlayerState.Playing && this.queue.length > 0) {
          this.initShufflingTracks(this.queueIndex);
        }
        this.updatePlayMode();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        this.playNextInPlaylist();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        this.playPrevInPlaylist();
      });
    }

    if (managerBtn) {
      managerBtn.addEventListener("click", (e) => {
        e.preventDefault();

        this.openManager();
      });
    }

    volumeInput.addEventListener("input", (e) => {
      const volume: number = parseFloat(volumeInput.value);

      clearTimeout(updateVolumeTimeout);

      this.execute(() => {
        this.player.setVolume(SoundView.transformVolume(volume));
        this.saveVolume(volume);
      });
    });

    const defaultVolume: number = this.getDefaultVolume();
    volumeInput.value = defaultVolume.toString(10);
    volumeInput.dispatchEvent(new Event("input"));

    setInterval(() => {
      if (!this.player) {
        return;
      }

      try {
        const duration = this.player.getDuration();
        const current = this.player.getCurrentTime();
        let percent: number;

        if (duration == 0 || current == 0) {
          percent = 0;
          this.timelineSet(0, false);
        } else {
          percent = ((current + 1) / duration) * 100;
        }

        if (!percent) {
          percent = 0;
        }

        this.timelineSet(percent, true);
      } catch (e) {
        //
      }
    }, 1000);

    if (quickPlaylist) {
      this.container
        .querySelector(".quick-playlist-btn")
        .addEventListener("click", (e) => {
          e.preventDefault();
          const id: number = parseInt(quickPlaylist.value, 10);

          if (!id) {
            return;
          }

          this.getClient().get(
            "music",
            "playPlaylist",
            { id: id },
            (response) => {
              this.startPlaylist(response);
            }
          );
        });
    }

    this.playerContainer = this.container.querySelector("#youtube-container");

    if (this.getUserState().isGm()) {
      const progressBar: HTMLDivElement =
        this.container.querySelector(".progress");

      this.getClient().get("music", "listPlaylist", {}, (response) => {
        this.updateAvailablePlaylists(response.playlists);
      });

      if (progressBar) {
        progressBar.addEventListener("mousemove", (e: MouseEvent) => {
          const target: HTMLDivElement = e.currentTarget as HTMLDivElement;
          const cursor: HTMLDivElement =
            this.container.querySelector(".pointed-time");
          const totalWidth: number = target.getBoundingClientRect().width;
          const clickedX: number = e.offsetX;
          const duration: number = this.player.getDuration();
          const pointedTime: number = (duration * clickedX) / totalWidth;

          cursor.classList.remove("d-none");
          cursor.style.left =
            Math.round(
              e.offsetX +
                target.offsetLeft -
                cursor.getBoundingClientRect().width / 2
            ).toString() + "px";
          cursor.innerText = MusicView.formatSecondToDuration(pointedTime);
        });
        progressBar.addEventListener("mouseleave", (e: MouseEvent) => {
          const target: HTMLDivElement = e.currentTarget as HTMLDivElement;
          const cursor: HTMLDivElement =
            this.container.querySelector(".pointed-time");

          cursor.classList.add("d-none");
        });
        progressBar.addEventListener("click", (e: MouseEvent) => {
          const target: HTMLDivElement = e.currentTarget as HTMLDivElement;
          const totalWidth: number = target.getBoundingClientRect().width;
          const clickedX: number = e.offsetX;
          const duration: number = this.player.getDuration();
          const seekTo: number = (duration * clickedX) / totalWidth;

          this.execute(() => {
            this.seek(seekTo);

            this.getClient().send("music", "seek", {
              position: seekTo,
            });
          });
        });
      }
    }
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }
}
