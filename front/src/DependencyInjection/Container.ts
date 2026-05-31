import { Container } from "inversify";
import { Services } from "./Services";
import { Constants } from "./Constants";
import { Board } from "../Engine/Board";
import { Stage } from "../Engine/Stage";
import { SquareGrid } from "../Engine/Board/Grid/SquareGrid";
import { HexGrid } from "../Engine/Board/Grid/HexGrid";
import { WebSocketClient } from "../Client/WebSocketClient";
import { ChatView } from "../View/ChatView";
import { Controller } from "../Controller/Controller";
import { Controllers } from "./Controllers";
import { ChatController } from "../Controller/ChatController";
import { Router } from "../Router";
import { Views } from "./Views";
import { CharacterView } from "../View/CharacterView";
import { CharacterController } from "../Controller/CharacterController";
import { UserController } from "../Controller/UserController";
import { UserRepository } from "../Repository/UserRepository";
import { Repository } from "./Repository";
import { DiceView } from "../View/DiceView";
import { DiceController } from "../Controller/DiceController";
import { View } from "../View/View";
import { ViewManager } from "../View/ViewManager";
import { Tree } from "../../shared/System/Tree";
import { Tables } from "../../shared/System/Tables";
import { CharacterRepository } from "../Repository/CharacterRepository";
import { PopinManager } from "../View/Popin/PopinManager";
import { Emitters } from "./Emitters";
import { ChatEmitter } from "../Emitter/ChatEmitter";
import { Emitter } from "../Emitter/Emitter";
import { EmitterManager } from "../Emitter/EmitterManager";
import { CharacterEmitter } from "../Emitter/CharacterEmitter";
import { CodeExecutor } from "../../shared/System/CodeExecutor";
import { SceneController } from "../Controller/SceneController";
import { GmView } from "../View/GmView";
import { SceneRepository } from "../Repository/SceneRepository";
import { SceneView } from "../View/SceneView";
import { SceneEmitter } from "../Emitter/SceneEmitter";
import { SceneState } from "../State/SceneState";
import { States } from "./State";
import { UserState } from "../State/UserState";
import { TableState } from "../State/TableState";
import { TableController } from "../Controller/TableController";
import { Clipboard } from "../Engine/Clipboard";
import { JournalView } from "../View/JournalView";
import { JournalController } from "../Controller/JournalController";
import { RulerView } from "../View/RulerView";
import { RulerState } from "../State/RulerState";
import { RulerController } from "../Controller/RulerController";
import { ZoomView } from "../View/ZoomView";
import { WindowState } from "../State/WindowState";
import { PingController } from "../Controller/PingController";
import { PingEmitter } from "../Emitter/PingEmitter";
import { TurnOrderView } from "../View/TurnOrderView";
import { TurnOrderController } from "../Controller/TurnOrderController";
import { CharacterState } from "../State/CharacterState";
import { Binding } from "../../shared/System/Binding";
import { MenuView } from "../View/MenuView";
import { FogState } from "../State/FogState";
import { Ui } from "../View/Ui";
import { ClusterLink } from "../Client/ClusterLink";
import { QuickBarView } from "../View/QuickBarView";
import { QuickBarController } from "../Controller/QuickBarController";
import { CraftView } from "../View/CraftView";
import { TokenView } from "../View/TokenView";
import { MediaController } from "../Controller/MediaController";
import { CancelState } from "../State/CancelState";
import { CraftEmitter } from "../Emitter/CraftEmitter";
import { CraftController } from "../Controller/CraftController";
import { CraftRepository } from "../Repository/CraftRepository";
import { DrawingsView } from "../View/DrawingsView";
import { DrawingState } from "../State/DrawingState";
import { DrawingTool } from "../Engine/Board/DrawingTool";
import { DrawingController } from "../Controller/DrawingController";
import { DrawingEmitter } from "../Emitter/DrawingEmitter";
import { DrawingLine } from "../Engine/Drawing/DrawingLine";
import { DrawingRect } from "../Engine/Drawing/DrawingRect";
import { DrawingFree } from "../Engine/Drawing/DrawingFree";
import { DrawingCircle } from "../Engine/Drawing/DrawingCircle";
import { DrawingPolygon } from "../Engine/Drawing/DrawingPolygon";
import { DrawingArrow } from "../Engine/Drawing/DrawingArrow";
import { DrawingText } from "../Engine/Drawing/DrawingText";
import { DrawingFreePolygon } from "../Engine/Drawing/DrawingFreePolygon";
import { DrawingPoI } from "../Engine/Drawing/DrawingPoI";
import { MusicView } from "../View/MusicView";
import { MusicController } from "../Controller/MusicController";
import { KonsoleView } from "../View/KonsoleView";
import { Translator } from "../../shared/System/Translator";
import { SoundView } from "../View/SoundView";
import { Transformers } from "../View/Sound/Transformers";
import { SoundPlayer } from "../View/Sound/SoundPlayer";
import { SoundController } from "../Controller/SoundController";
import { PersistedState } from "../State/PersistedState";
import { CharacterSkinLoader } from "../View/Character/CharacterSkinLoader";
import { TokenEmitter } from "../Emitter/TokenEmitter";
import { ToolState } from "../State/ToolState";
import { BookController } from "../Controller/BookController";
import { BookView } from "../View/BookView";
import { RollState } from "../State/RollState";
import { EditorManager } from "../View/Journal/EditorManager";
import { DragDropState } from "../State/DragDropState";
import { MediaView } from "../View/MediaView";
import { PdfView } from "../View/PdfView";
import { PdfController } from "../Controller/PdfController";
import { DynamicLightingView } from "../View/DynamicLightingView";
import { LightingState } from "../State/LightingState";
import { DiceRollerView } from "../View/DiceRollerView";
import { SceneBrowserView } from "../View/Scene/SceneBrowser";
import { KeyboardState } from "../State/KeyboardState";
import { Collision } from "../Engine/Board/DynamicLighting/Collision";

const container = new Container();

// Services
container.bind<Router>(Services.Router).to(Router).inSingletonScope();
container.bind<Board>(Services.Board).to(Board).inSingletonScope();
container.bind<Collision>(Services.Collision).to(Collision).inSingletonScope();
container.bind<Stage>(Services.Stage).to(Stage).inSingletonScope();
container
  .bind<DrawingTool>(Services.DrawingTool)
  .to(DrawingTool)
  .inSingletonScope();
container.bind<Tree>(Services.SystemTree).to(Tree).inSingletonScope();
container.bind<Tables>(Services.SystemTables).to(Tables).inSingletonScope();
container.bind<Binding>(Services.SystemBinding).to(Binding).inSingletonScope();
container
  .bind<PopinManager>(Services.PopinManager)
  .to(PopinManager)
  .inSingletonScope();
container
  .bind<CodeExecutor>(Services.CodeExecutor)
  .to(CodeExecutor)
  .inSingletonScope();
container.bind<Clipboard>(Services.Clipboard).to(Clipboard).inSingletonScope();
container
  .bind<ClusterLink>(Services.ClusterLink)
  .to(ClusterLink)
  .inSingletonScope();
container
  .bind<Translator>(Services.SystemTranslator)
  .to(Translator)
  .inSingletonScope();
container
  .bind<Transformers>(Services.SoundTransformers)
  .to(Transformers)
  .inSingletonScope();
container
  .bind<SoundPlayer>(Services.SoundPlayer)
  .to(SoundPlayer)
  .inSingletonScope();
container
  .bind<CharacterSkinLoader>(Services.CharacterSkinLoader)
  .to(CharacterSkinLoader)
  .inSingletonScope();
container
  .bind<EditorManager>(Services.EditorManager)
  .to(EditorManager)
  .inSingletonScope();

// Drawings
container
  .bind<DrawingLine>(Services.DrawingLine)
  .to(DrawingLine)
  .inSingletonScope();
container
  .bind<DrawingRect>(Services.DrawingRect)
  .to(DrawingRect)
  .inSingletonScope();
container
  .bind<DrawingFree>(Services.DrawingFree)
  .to(DrawingFree)
  .inSingletonScope();
container
  .bind<DrawingCircle>(Services.DrawingCircle)
  .to(DrawingCircle)
  .inSingletonScope();
container
  .bind<DrawingPolygon>(Services.DrawingPolygon)
  .to(DrawingPolygon)
  .inSingletonScope();
container
  .bind<DrawingArrow>(Services.DrawingArrow)
  .to(DrawingArrow)
  .inSingletonScope();
container
  .bind<DrawingText>(Services.DrawingText)
  .to(DrawingText)
  .inSingletonScope();
container
  .bind<DrawingFreePolygon>(Services.DrawingFreePolygon)
  .to(DrawingFreePolygon)
  .inSingletonScope();
container
  .bind<DrawingPoI>(Services.DrawingPoI)
  .to(DrawingPoI)
  .inSingletonScope();

// Grids
container
  .bind<SquareGrid>(Services.SquareGrid)
  .to(SquareGrid)
  .inSingletonScope();
container.bind<HexGrid>(Services.HexGrid).to(HexGrid).inSingletonScope();

// WS Client
container
  .bind<WebSocketClient>(Services.WebSocketClient)
  .to(WebSocketClient)
  .inSingletonScope();

// States
container.bind<SceneState>(States.Scene).to(SceneState).inSingletonScope();
container.bind<UserState>(States.User).to(UserState).inSingletonScope();
container.bind<TableState>(States.Table).to(TableState).inSingletonScope();
container.bind<RulerState>(States.Ruler).to(RulerState).inSingletonScope();
container.bind<WindowState>(States.Window).to(WindowState).inSingletonScope();
container
  .bind<CharacterState>(States.Character)
  .to(CharacterState)
  .inSingletonScope();
container.bind<FogState>(States.Fog).to(FogState).inSingletonScope();
container.bind<CancelState>(States.Cancel).to(CancelState).inSingletonScope();
container
  .bind<DrawingState>(States.Drawing)
  .to(DrawingState)
  .inSingletonScope();
container
  .bind<PersistedState>(States.Persisted)
  .to(PersistedState)
  .inSingletonScope();
container.bind<ToolState>(States.Tool).to(ToolState).inSingletonScope();
container.bind<RollState>(States.Roll).to(RollState).inSingletonScope();
container
  .bind<DragDropState>(States.DragDrop)
  .to(DragDropState)
  .inSingletonScope();
container
  .bind<LightingState>(States.Lighting)
  .to(LightingState)
  .inSingletonScope();
container
  .bind<KeyboardState>(States.Keyboard)
  .to(KeyboardState)
  .inSingletonScope();

// Views
const views = [
  { symbol: Views.Chat, class: ChatView },
  { symbol: Views.Character, class: CharacterView },
  { symbol: Views.Dice, class: DiceView },
  { symbol: Views.Gm, class: GmView },
  { symbol: Views.Scene, class: SceneView },
  { symbol: Views.Encyclopedia, class: JournalView },
  { symbol: Views.Ruler, class: RulerView },
  { symbol: Views.Zoom, class: ZoomView },
  { symbol: Views.TurnOrder, class: TurnOrderView },
  { symbol: Views.TaskBar, class: MenuView },
  { symbol: Views.Ui, class: Ui },
  { symbol: Views.QuickBar, class: QuickBarView },
  { symbol: Views.Craft, class: CraftView },
  { symbol: Views.Token, class: TokenView },
  { symbol: Views.Drawings, class: DrawingsView },
  { symbol: Views.Music, class: MusicView },
  { symbol: Views.Konsole, class: KonsoleView },
  { symbol: Views.Sound, class: SoundView },
  { symbol: Views.Book, class: BookView },
  { symbol: Views.Media, class: MediaView },
  { symbol: Views.Pdf, class: PdfView },
  { symbol: Views.DynamicLighting, class: DynamicLightingView },
  { symbol: Views.DiceRoller, class: DiceRollerView },
  { symbol: Views.SceneBrowser, class: SceneBrowserView },
];

container.bind<ViewManager>(Views.Manager).to(ViewManager).inSingletonScope();

views.forEach((view: any) => {
  container.bind(view.symbol).to(view.class).inSingletonScope();
});

// Controllers
const controllers = [
  { symbol: Controllers.Chat, class: ChatController },
  { symbol: Controllers.Character, class: CharacterController },
  { symbol: Controllers.User, class: UserController },
  { symbol: Controllers.Dice, class: DiceController },
  { symbol: Controllers.Scene, class: SceneController },
  { symbol: Controllers.Table, class: TableController },
  { symbol: Controllers.Journal, class: JournalController },
  { symbol: Controllers.Ruler, class: RulerController },
  { symbol: Controllers.Ping, class: PingController },
  { symbol: Controllers.TurnOrder, class: TurnOrderController },
  { symbol: Controllers.QuickBar, class: QuickBarController },
  { symbol: Controllers.Media, class: MediaController },
  { symbol: Controllers.Craft, class: CraftController },
  { symbol: Controllers.Drawing, class: DrawingController },
  { symbol: Controllers.Music, class: MusicController },
  { symbol: Controllers.Sound, class: SoundController },
  { symbol: Controllers.Book, class: BookController },
  { symbol: Controllers.Pdf, class: PdfController },
];

controllers.forEach((controller: any) => {
  container.bind(controller.symbol).to(controller.class).inSingletonScope();
});

// Emitters
const emitters = [
  { symbol: Emitters.Chat, class: ChatEmitter },
  { symbol: Emitters.Character, class: CharacterEmitter },
  { symbol: Emitters.Scene, class: SceneEmitter },
  { symbol: Emitters.Ping, class: PingEmitter },
  { symbol: Emitters.Craft, class: CraftEmitter },
  { symbol: Emitters.Drawing, class: DrawingEmitter },
  { symbol: Emitters.Token, class: TokenEmitter },
];

container
  .bind<EmitterManager>(Emitters.Manager)
  .to(EmitterManager)
  .inSingletonScope();

emitters.forEach((emitter: any) => {
  container.bind(emitter.symbol).to(emitter.class).inSingletonScope();
});

// Repositories
container
  .bind<UserRepository>(Repository.UserRepository)
  .to(UserRepository)
  .inSingletonScope();
container
  .bind<CharacterRepository>(Repository.CharacterRepository)
  .to(CharacterRepository)
  .inSingletonScope();
container
  .bind<SceneRepository>(Repository.Scene)
  .to(SceneRepository)
  .inSingletonScope();
container
  .bind<CraftRepository>(Repository.Craft)
  .to(CraftRepository)
  .inSingletonScope();

// Constants
container.bind<string>(Constants.DomId).toConstantValue("map");
container
  .bind<string>(Constants.CharacterColId)
  .toConstantValue("character-col");

// Multi Inject
controllers.forEach((controller: any) => {
  container
    .bind<Controller>(Controllers.Controller)
    .toConstantValue(container.get(controller.symbol));
});

emitters.forEach((emitter: any) => {
  container
    .bind<Emitter>(Emitters.Emitter)
    .toConstantValue(container.get(emitter.symbol));
});

views.forEach((view: any) => {
  container.bind<View>(Views.View).toConstantValue(container.get(view.symbol));
});

export { container };
