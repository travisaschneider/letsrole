const States = {
  Scene: Symbol.for("SceneState"),
  User: Symbol.for("UserState"),
  Table: Symbol.for("TableState"),
  Ruler: Symbol.for("RulerState"),
  Window: Symbol.for("WindowState"),
  Character: Symbol.for("CharacterState"),
  Fog: Symbol.for("FogState"),
  Cancel: Symbol.for("CancelState"),
  Drawing: Symbol.for("DrawingState"),
  Persisted: Symbol.for("PersistedState"),
  Tool: Symbol.for("ToolState"),
  Roll: Symbol.for("RollState"),
  DragDrop: Symbol.for("DragDrop"),
  Lighting: Symbol.for("LightingState"),
  Keyboard: Symbol.for("KeyboardState"),
};

export { States };
