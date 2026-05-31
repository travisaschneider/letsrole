const Services = {
  SystemTree: "SystemTree", // not a symbol so it can be used in the shared folder
  SystemTables: "SystemTables", // not a symbol so it can be used in the shared folder
  CodeExecutor: Symbol.for("CodeExecutor"),
  SystemTranslator: "SystemTranslator",
  CharacterSkinLoader: Symbol.for("CharacterSkinLoader"),
  RollState: Symbol.for("RollState"),
  DiceExpressionHelper: Symbol.for("DiceExpressionHelper"),
};

export { Services };
