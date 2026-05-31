const Services = {
  TokenBuilder: Symbol.for("TokenBuilder"),
  Board: Symbol.for("Board"),
  Stage: Symbol.for("Stage"),
  SquareGrid: Symbol.for("SquareGrid"),
  HexGrid: Symbol.for("HexGrid"),
  Clipboard: Symbol.for("Clipboard"),
  DrawingTool: Symbol.for("DrawingTool"),
  CharacterSkinLoader: Symbol.for("CharacterSkinLoader"),
  EditorManager: Symbol.for("EditorManager"),
  Collision: Symbol.for("Collision"),

  // not a symbol, so it can be used in the shared folder
  CodeExecutor: "SystemCodeExecutor",
  SystemTree: "SystemTree",
  SystemTables: "SystemTables",
  SystemBinding: "SystemBinding",
  SystemTranslator: "SystemTranslator",

  WebSocketClient: Symbol.for("WebSocketClient"),
  ClusterLink: Symbol.for("ClusterLink"),

  Router: Symbol.for("Router"),

  ChatCommand: Symbol.for("ChatCommand"),
  PopinManager: Symbol.for("PopinManager"),

  DrawingLine: Symbol.for("DrawingLine"),
  DrawingRect: Symbol.for("DrawingRect"),
  DrawingFree: Symbol.for("DrawingFree"),
  DrawingCircle: Symbol.for("DrawingCircle"),
  DrawingPolygon: Symbol.for("DrawingPolygon"),
  DrawingArrow: Symbol.for("DrawingArrow"),
  DrawingText: Symbol.for("DrawingText"),
  DrawingFreePolygon: Symbol.for("DrawingFreePolygon"),
  DrawingPoI: Symbol.for("DrawingPoI"),

  SoundTransformers: Symbol.for("SoundTransformers"),
  SoundPlayer: Symbol.for("SoundPlayer"),
};

export { Services };
