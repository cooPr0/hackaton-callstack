import Foundation
import Security

public protocol TokenStore: Sendable {
    func save(code: String, tokens: [String]) throws
    func load(code: String) throws -> [String]?
    func delete(code: String) throws
}

public struct KeychainTokenStore: TokenStore, Sendable {
    public var service: String

    public init(service: String = "com.tintandtell.room") {
        self.service = service
    }

    public func save(code: String, tokens: [String]) throws {
        let data = try JSONEncoder().encode(tokens)
        let base = query(code: code)
        SecItemDelete(base as CFDictionary)
        var insert = base
        insert[kSecValueData as String] = data
        insert[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        let status = SecItemAdd(insert as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError(status: status) }
    }

    public func load(code: String) throws -> [String]? {
        var query = query(code: code)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data else { throw KeychainError(status: status) }
        return try JSONDecoder().decode([String].self, from: data)
    }

    public func delete(code: String) throws {
        let status = SecItemDelete(query(code: code) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError(status: status)
        }
    }

    private func query(code: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: code,
        ]
    }
}

public struct KeychainError: Error, Sendable, Equatable {
    public var status: OSStatus
}
