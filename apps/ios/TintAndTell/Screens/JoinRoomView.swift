import Inject
import SwiftUI
import TintDesign
import TintKit

/// Claim an open seat. A pasted room link is reduced to its code.
struct JoinRoomView: View {
    @ObserveInjection var inject

    var initialCode: String
    var onCancel: () -> Void
    var onJoined: (RoomSession) -> Void

    @State private var code: String
    @State private var name: String
    @State private var failure: Failure?
    @State private var busy = false
    @FocusState private var focused: Field?

    private enum Field: Hashable {
        case code
        case name
    }

    init(initialCode: String, onCancel: @escaping () -> Void, onJoined: @escaping (RoomSession) -> Void) {
        self.initialCode = initialCode
        self.onCancel = onCancel
        self.onJoined = onJoined
        _code = State(initialValue: initialCode)
        _name = State(initialValue: UserDefaults.standard.string(forKey: RoomSession.nameKey) ?? "")
    }

    private var ready: Bool {
        code.count == RoomLink.length && !name.trimmingCharacters(in: .whitespaces).isEmpty && !busy
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: onCancel) {
                Image(systemName: "chevron.left")
                    .font(.body.weight(.semibold))
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(Text(.joinLeave))

            Text(.joinTitle)
                .font(.display)
                .foregroundStyle(Color.ink)
                .padding(.top, 8)

            Text(.joinCode)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Color.ink2)
                .padding(.top, 28)

            TextField("", text: $code, prompt: Text(verbatim: "·····").foregroundStyle(Color.ink3))
                .focused($focused, equals: .code)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .keyboardType(.asciiCapable)
                .submitLabel(.continue)
                .font(.system(size: 56, weight: .heavy).width(.expanded))
                .tracking(2)
                .foregroundStyle(Color.ink)
                .padding(.top, 4)
                .accessibilityLabel(Text(.joinCode))
                .onChange(of: code) { _, raw in
                    let next = cleaned(raw)
                    if next != raw { code = next }
                }
                .onSubmit { focused = .name }

            TextField(.joinName, text: $name)
                .focused($focused, equals: .name)
                .textInputAutocapitalization(.words)
                .font(.title2.weight(.semibold))
                .foregroundStyle(Color.ink)
                .padding(.top, 20)
                .onChange(of: name) { _, raw in
                    if raw.count > 24 { name = String(raw.prefix(24)) }
                }
                .onSubmit(submit)

            Spacer(minLength: 16)

            if let failure {
                Text(failure.title)
                    .font(.body)
                    .foregroundStyle(Color.ink)
                    .padding(.bottom, 12)
                    .accessibilityAddTraits(.isStaticText)
            }

            Button(action: submit) {
                Text(.joinSubmit)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color.ground)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(Color.ink, in: Capsule())
            }
            .buttonStyle(.plain)
            .disabled(!ready)
            .opacity(ready ? 1 : 0.38)
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color.ground.ignoresSafeArea())
        .tint(Color.ink)
        .onAppear { if code.count < RoomLink.length { focused = .code } }
        .enableInjection()
    }

    private func cleaned(_ raw: String) -> String {
        if raw.contains("://") || raw.contains("/"), let parsed = RoomLink.code(from: raw) {
            return parsed
        }
        return String(raw.uppercased().filter { RoomLink.alphabet.contains($0) }.prefix(RoomLink.length))
    }

    private func submit() {
        let seat = name.trimmingCharacters(in: .whitespaces)
        guard ready else { return }
        busy = true
        failure = nil
        Task {
            defer { busy = false }
            do {
                let credential = try await RemoteRoom.api.join(code: code, name: seat)
                try KeychainTokenStore().save(code: code, tokens: [credential.token])
                UserDefaults.standard.set(seat, forKey: RoomSession.nameKey)
                let session = RoomSession(code: code)
                try await session.connect(tokens: [credential.token], name: seat)
                onJoined(session)
            } catch let error as APIError {
                failure = Failure(error)
            } catch {
                failure = .failed
            }
        }
    }

    private enum Failure {
        case missing
        case full
        case failed

        init(_ error: APIError) {
            switch error {
            case .server(.roomNotFound, _, _): self = .missing
            case .server(.roomFull, _, _): self = .full
            default: self = .failed
            }
        }

        var title: LocalizedStringResource {
            switch self {
            case .missing: .joinMissing
            case .full: .joinFull
            case .failed: .joinFailed
            }
        }
    }
}
