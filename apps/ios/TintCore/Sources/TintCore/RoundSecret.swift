/// The cue giver's target. Held by the local engine, never stored on `RoundDefinition`.
public struct RoundSecret: Sendable, Equatable {
    public struct Cell: Sendable, Equatable {
        public let x: Int
        public let y: Int

        public init(x: Int, y: Int) {
            self.x = x
            self.y = y
        }
    }

    public struct Window: Sendable, Equatable {
        public let x0: Int
        public let y0: Int

        public init(x0: Int, y0: Int) {
            self.x0 = x0
            self.y0 = y0
        }
    }

    public let target: Cell
    public let window: Window

    public init(target: Cell, window: Window) {
        self.target = target
        self.window = window
    }
}

/// Who gives the clue this round, plus the target the local engine keeps private.
public struct RoundSetup: Sendable, Equatable {
    public let cueGiverSeatId: String
    public let secret: RoundSecret

    public init(cueGiverSeatId: String, secret: RoundSecret) {
        self.cueGiverSeatId = cueGiverSeatId
        self.secret = secret
    }
}

/// Supplies the cue giver and target for round `index` (1...total). Target picking stays outside TintCore.
public typealias RoundSetupProvider = @Sendable (_ index: Int, _ seatIds: [String]) -> RoundSetup
