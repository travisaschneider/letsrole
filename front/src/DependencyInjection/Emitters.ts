const Emitters = {
  Emitter: Symbol.for("Emitter"),
  Manager: Symbol.for("EmitterManager"),
  Chat: Symbol.for("ChatEmitter"),
  Character: Symbol.for("CharacterEmitter"),
  Scene: Symbol.for("SceneEmitter"),
  Ping: Symbol.for("PingEmitter"),
  Craft: Symbol.for("CraftEmitter"),
  Drawing: Symbol.for("DrawingEmitter"),
  Token: Symbol.for("TokenEmitter"),
};

export { Emitters };
