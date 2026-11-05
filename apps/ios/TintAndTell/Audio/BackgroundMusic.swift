import AVFoundation

/// Calm bed under the whole party. Starts with the process, loops, and keeps playing in the background.
@MainActor
enum BackgroundMusic {
    private static var player: AVAudioPlayer?
    private static var observing = false
    private static let level: Float = 0.32

    static func start() {
        configureSession()
        observeInterruptions()
        if let player {
            if !player.isPlaying { player.play() }
            return
        }
        guard let url = Bundle.main.url(forResource: "ambient", withExtension: "mp3", subdirectory: "Sounds")
            ?? Bundle.main.url(forResource: "ambient", withExtension: "mp3")
        else { return }
        guard let player = try? AVAudioPlayer(contentsOf: url) else { return }
        player.numberOfLoops = -1
        player.volume = level
        player.prepareToPlay()
        self.player = player
        player.play()
    }

    private static func configureSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)
    }

    private static func observeInterruptions() {
        guard !observing else { return }
        observing = true
        NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil,
            queue: .main
        ) { notification in
            guard let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? NSNumber,
                  AVAudioSession.InterruptionType(rawValue: raw.uintValue) == .ended
            else { return }
            let options = notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? NSNumber
            let shouldResume = options.map {
                AVAudioSession.InterruptionOptions(rawValue: $0.uintValue).contains(.shouldResume)
            } ?? true
            guard shouldResume else { return }
            Task { @MainActor in
                start()
            }
        }
    }
}
