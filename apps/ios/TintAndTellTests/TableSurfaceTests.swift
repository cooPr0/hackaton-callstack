import Testing
@testable import TintAndTell

@Suite("Table surface")
struct TableSurfaceTests {
    @Test("A folded Duo withholds the board in a local game and an online one")
    func foldedDuoAsksToOpen() {
        for local in [true, false] {
            let surface = tableSurface(local: local, moment: .playing, wideOpen: false, fold: .closed)
            #expect(surface == .askToOpen)
        }
        let wideButShut = tableSurface(local: false, moment: .playing, wideOpen: true, fold: .closed)
        #expect(wideButShut == .askToOpen)
    }

    @Test("Local play on a closed phone asks to open; online play shows the upright board")
    func phoneWithoutAHinge() {
        let local = tableSurface(local: true, moment: .playing, wideOpen: false, fold: .none)
        let online = tableSurface(local: false, moment: .playing, wideOpen: false, fold: .none)
        #expect(local == .askToOpen)
        #expect(online == .board(portrait: true))
    }

    @Test("An open table shows the full board")
    func openTable() {
        let local = tableSurface(local: true, moment: .playing, wideOpen: true, fold: .open)
        let online = tableSurface(local: false, moment: .playing, wideOpen: true, fold: .none)
        #expect(local == .board(portrait: false))
        #expect(online == .board(portrait: false))
    }

    @Test("Grok's secret stays sealed until the phone is open, then it is the table")
    func grokSecret() {
        let closed = tableSurface(local: false, moment: .grokSecret, wideOpen: false, fold: .none)
        let folded = tableSurface(local: true, moment: .grokSecret, wideOpen: true, fold: .closed)
        let open = tableSurface(local: false, moment: .grokSecret, wideOpen: true, fold: .open)
        #expect(closed == .askToOpen)
        #expect(folded == .askToOpen)
        #expect(open == .board(portrait: false))
    }

    @Test("The local shade hides once the board would be public")
    func shade() {
        #expect(localKeepsShade(wideOpen: false, fold: .none))
        #expect(localKeepsShade(wideOpen: true, fold: .closed))
        #expect(!localKeepsShade(wideOpen: true, fold: .open))
    }
}
