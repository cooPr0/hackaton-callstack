import AVFoundation

/// Calm bed under the whole party. Loops, stays quiet enough to talk over, and follows the silent switch.
@MainActor
enum BackgroundMusic {
    private static var player: AVAudioPlayer?
    private static let level: Float = 0.32

    static func start() {
        if player?.isPlaying == true { return }
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)
        guard let url = Bundle.main.url(forResource: "ambient", withExtension: "mp3", subdirectory: "Sounds")
            ?? Bundle.main.url(forResource: "ambient", withExtension: "mp3")
        else { return }
        guard let player = try? AVAudioPlayer(contentsOf: url) else { return }
        player.numberOfLoops = -1
        player.volume = 0
        player.prepareToPlay()
        player.play()
        player.setVolume(level, fadeDuration: 1.2)
        self.player = player
    }
}
