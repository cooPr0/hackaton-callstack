import CoreGraphics

/// Hinge reading for the table. `none` is a phone or an iPad: there is nothing to unfold.
enum DeviceFold: Equatable {
    case none
    case closed
    case open
}

/// What the table screen is doing. Grok's secret is not the guessing board.
enum TableMoment: Equatable {
    /// Stones, the reveal, or a guesser waiting on the board.
    case playing
    /// Grok holds the shade. The board appears only once the phone is open on the table.
    case grokSecret
}

/// One screen, two game modes.
///
/// A folded Duo never shows the board: local or online, the table asks to be opened.
/// Online on a device with no hinge still plays — the board fits the closed phone.
/// Local play keeps the board off that phone, because this device holds every secret.
enum TableSurface: Equatable {
    case askToOpen
    case board(portrait: Bool)
}

func tableSurface(local: Bool, moment: TableMoment, wideOpen: Bool, fold: DeviceFold) -> TableSurface {
    switch moment {
    case .grokSecret:
        if fold != .closed, wideOpen {
            return .board(portrait: false)
        }
        return .askToOpen
    case .playing:
        if fold == .closed {
            return .askToOpen
        }
        if wideOpen {
            return .board(portrait: false)
        }
        if local {
            return .askToOpen
        }
        return .board(portrait: true)
    }
}

/// Local pass-and-play. The shade stays on screen only while the table itself is withheld.
func localKeepsShade(wideOpen: Bool, fold: DeviceFold) -> Bool {
    if case .board = tableSurface(local: true, moment: .playing, wideOpen: wideOpen, fold: fold) {
        return false
    }
    return true
}

/// Protocol posture: the open table is landscape and at least the inner display wide.
nonisolated func isWideOpenTable(size: CGSize) -> Bool {
    size.width > size.height && size.width >= 700
}
