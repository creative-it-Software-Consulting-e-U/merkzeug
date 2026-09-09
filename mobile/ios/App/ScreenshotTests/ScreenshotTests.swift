import XCTest
import UIKit

final class ScreenshotTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    func testEnglish() throws { try capture(locale: "en") }
    func testGerman() throws { try capture(locale: "de") }

    private func capture(locale: String) throws {
        let bundle = Bundle(for: Self.self)
        let fixtures = try XCTUnwrap(bundle.url(forResource: "demo", withExtension: nil)).appendingPathComponent(locale)
        var files = [String: String]()
        for case let file as URL in try XCTUnwrap(FileManager.default.enumerator(at: fixtures, includingPropertiesForKeys: nil)) where file.pathExtension == "md" {
            files[String(file.path.dropFirst(fixtures.path.count + 1))] = try String(contentsOf: file, encoding: .utf8)
        }
        let captionsURL = try XCTUnwrap(bundle.url(forResource: "captions", withExtension: "json"))
        let captions = try JSONDecoder().decode([String: [String: Caption]].self, from: Data(contentsOf: captionsURL))
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(\(locale))", "-AppleLocale", locale == "de" ? "de_AT" : "en_US"]
        app.launchEnvironment = ["MERKZEUG_DEMO_MODE": "1", "MERKZEUG_DEMO_FILES": String(data: try JSONSerialization.data(withJSONObject: files), encoding: .utf8)!, "MERKZEUG_DEMO_LOCALE": locale]
        for scene in ["writing", "diagram", "frontmatter"] {
            app.launchEnvironment["MERKZEUG_DEMO_NOTE"] = scene == "diagram" ? (locale == "de" ? "/Projekte/Garten.md" : "/Projects/Garden.md") : (locale == "de" ? "/Willkommen.md" : "/Welcome.md")
            app.launchEnvironment["MERKZEUG_DEMO_SCENE"] = scene
            app.launch()
            XCTAssertTrue(app.otherElements["merkzeug-screenshot-ready"].waitForExistence(timeout: 60), "Editor, fonts and diagram must finish rendering")
            let raw = app.screenshot()
            let edition = UIDevice.current.userInterfaceIdiom == .pad ? "ipad" : "iphone"
            let name = "\(edition)-\(locale)-\(scene)"
            let attachment = XCTAttachment(screenshot: raw)
            attachment.name = "raw-" + name; attachment.lifetime = .keepAlways; add(attachment)
            let caption = try XCTUnwrap(captions[locale]?[scene])
            let framed = try ScreenshotFrame.render(try XCTUnwrap(raw.image.cgImage), title: caption.title, subtitle: caption.subtitle)
            let store = XCTAttachment(data: framed, uniformTypeIdentifier: "public.png")
            store.name = "store-" + name; store.lifetime = .keepAlways; add(store)
            app.terminate()
        }
    }
    private struct Caption: Decodable { let title: String; let subtitle: String }
}
