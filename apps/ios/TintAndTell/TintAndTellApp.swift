//
//  TintAndTellApp.swift
//  TintAndTell
//
//  Created by Łukasz Lech on 05/11/2026.
//

import SwiftUI

@main
struct TintAndTellApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @State private var links = IncomingLink()

    init() {
        BackgroundMusic.start()
    }

    var body: some Scene {
        WindowGroup {
            GameShell()
                .environment(links)
                .onOpenURL { links.open($0) }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                BackgroundMusic.start()
            }
        }
    }
}
