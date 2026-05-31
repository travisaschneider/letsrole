const Controllers = {
  Controller: Symbol.for("Controller"),
  Chat: Symbol.for("ChatController"),
  Character: Symbol.for("CharacterController"),
  User: Symbol.for("UserController"),
  Dice: Symbol.for("DiceController"),
  Scene: Symbol.for("SceneController"),
  Table: Symbol.for("TableController"),
  Journal: Symbol.for("JournalController"),
  Ruler: Symbol.for("RulerController"),
  Ping: Symbol.for("PingController"),
  TurnOrder: Symbol.for("TurnOrderController"),
  QuickBar: Symbol.for("QuickBarController"),
  Media: Symbol.for("MediaController"),
  Craft: Symbol.for("CraftController"),
  Drawing: Symbol.for("DrawingController"),
  Music: Symbol.for("MusicProvider"),
  Sound: Symbol.for("SoundController"),
  Book: Symbol.for("BookController"),
  Pdf: Symbol.for("PdfController"),
};

export { Controllers };
