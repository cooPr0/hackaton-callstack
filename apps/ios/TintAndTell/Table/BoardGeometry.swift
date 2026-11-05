import CoreGraphics

/// Where the 24 × 12 board sits inside the space it was given.
///
/// A division reserved region centers the wider grout on the fold. Without one
/// (a phone, or a Split View pane the fold does not cross) every gap is equal.
struct BoardGeometry: Equatable {
    static let columns = 24
    static let rows = 12
    /// Wider grout follows this column, between the two halves of the board.
    static let hingeAfterColumn = 11

    private static let groutRatio: CGFloat = 0.08
    private static let hingeRatio: CGFloat = 0.32

    var cell: CGFloat
    var grout: CGFloat
    var hingeGap: CGFloat
    var origin: CGPoint

    func rect(column: Int, row: Int) -> CGRect {
        let seam = column > Self.hingeAfterColumn ? hingeGap - grout : 0
        let x = origin.x + CGFloat(column) * (cell + grout) + seam
        let y = origin.y + CGFloat(row) * (cell + grout)
        return CGRect(x: x, y: y, width: cell, height: cell)
    }

    func cell(at point: CGPoint) -> (x: Int, y: Int)? {
        guard cell > 0 else { return nil }
        let row = Int((point.y - origin.y) / (cell + grout))
        guard row >= 0, row < Self.rows else { return nil }
        for column in 0..<Self.columns where rect(column: column, row: row).contains(point) {
            return (column, row)
        }
        return nil
    }

    /// `division` is a fold region in the same coordinates as `size`.
    /// Pass `nil` when the window has no division region.
    static func make(in size: CGSize, division: CGRect?) -> BoardGeometry? {
        guard size.width > 1, size.height > 1 else { return nil }

        let half = CGFloat(columns / 2)
        let groutsInHalf = half - 1
        let verticalGrouts = CGFloat(rows - 1)
        let verticalUnit = CGFloat(rows) + verticalGrouts * groutRatio

        let hingeCenter = division.flatMap { region -> CGFloat? in
            // A fold across the window (Duo turned long-side up) is not this board's seam.
            guard region.height >= region.width else { return nil }
            let mid = region.midX
            guard mid > 0, mid < size.width else { return nil }
            return mid
        }

        let cell: CGFloat
        let hingeGap: CGFloat
        if let hingeCenter {
            let span = min(hingeCenter, size.width - hingeCenter)
            let fold = max(division?.width ?? 0, 0)
            let unit = half + groutsInHalf * groutRatio
            func fitted(gap: CGFloat) -> CGFloat {
                let inner = span - gap / 2
                guard inner > 1 else { return 0 }
                return min(inner / unit, size.height / verticalUnit)
            }
            let widthLimited = fitted(gap: fold)
            let reserved = max(widthLimited * hingeRatio, fold)
            cell = fitted(gap: reserved)
            hingeGap = max(cell * hingeRatio, fold)
        } else {
            let horizontal = size.width / (CGFloat(columns) + CGFloat(columns - 1) * groutRatio)
            cell = min(horizontal, size.height / verticalUnit)
            hingeGap = cell * groutRatio
        }

        guard cell > 0.5 else { return nil }
        let grout = cell * groutRatio
        let boardHeight = CGFloat(rows) * cell + verticalGrouts * grout

        let origin: CGPoint
        if let hingeCenter {
            let leftBlock = half * cell + groutsInHalf * grout
            origin = CGPoint(
                x: hingeCenter - hingeGap / 2 - leftBlock,
                y: (size.height - boardHeight) / 2
            )
        } else {
            let boardWidth = CGFloat(columns) * cell + CGFloat(columns - 1) * grout
            origin = CGPoint(
                x: (size.width - boardWidth) / 2,
                y: (size.height - boardHeight) / 2
            )
        }

        return BoardGeometry(cell: cell, grout: grout, hingeGap: hingeGap, origin: origin)
    }
}
