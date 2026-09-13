import XCTest
import UIKit

final class ScreenshotTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    func testEnglish() throws { try capture(locale: "en") }
    func testGerman() throws { try capture(locale: "de") }

    func testPrinting() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        let files = ["Welcome.md": "# Print acceptance\n\nSaved content for printing.\n\n```mermaid\nflowchart LR\n A --> B\n```\n"]
        app.launchEnvironment = ["MERKZEUG_DEMO_MODE": "1", "MERKZEUG_DEMO_FILES": String(data: try JSONSerialization.data(withJSONObject: files), encoding: .utf8)!, "MERKZEUG_DEMO_NOTE": "/Welcome.md"]
        app.launch()
        if app.buttons["Start tour"].waitForExistence(timeout: 10) { app.buttons.matching(identifier: "Later").allElementsBoundByIndex.last?.tap() }
        XCTAssertTrue(app.buttons["Print…"].waitForExistence(timeout: 60))
        app.buttons["Print…"].tap()
        let printButton = app.buttons["Print…"]
        XCTAssertTrue(printButton.waitForExistence(timeout: 30))
        let ready = NSPredicate(format: "enabled == true")
        expectation(for: ready, evaluatedWith: printButton)
        waitForExpectations(timeout: 60)
        printButton.tap()
        let cancel = app.buttons["Cancel"].firstMatch
        XCTAssertTrue(cancel.waitForExistence(timeout: 20), app.debugDescription)
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "AirPrint preview"; screenshot.lifetime = .keepAlways; add(screenshot)
        cancel.tap()
        XCTAssertTrue(app.buttons["Close"].waitForExistence(timeout: 10))
        app.buttons["Close"].tap()
        XCTAssertTrue(app.buttons["Edit"].waitForExistence(timeout: 10))
        app.terminate()
    }

    func testRoadmap() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        let files = ["Welcome.md": "# Roadmap test\n\nA native simulator note.\n"]
        app.launchEnvironment = ["MERKZEUG_DEMO_MODE": "1", "MERKZEUG_DEMO_FILES": String(data: try JSONSerialization.data(withJSONObject: files), encoding: .utf8)!, "MERKZEUG_DEMO_NOTE": "/Welcome.md"]
        app.launch()
        let start = app.buttons["Start tour"]
        if start.waitForExistence(timeout: 20) {
            start.tap()
            XCTAssertTrue(app.buttons["Next"].waitForExistence(timeout: 5))
            app.buttons["Next"].tap()
            app.buttons["Close"].firstMatch.tap()
        }
        let meeting = app.buttons["New meeting note"]
        XCTAssertTrue(meeting.waitForExistence(timeout: 20))
        meeting.tap()
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let allow = springboard.buttons.matching(NSPredicate(format: "label IN %@", ["Allow Full Access", "Vollen Zugriff erlauben"])).firstMatch
        if allow.waitForExistence(timeout: 8) { allow.tap() }
        XCTAssertTrue(app.staticTexts["No events in this date range."].waitForExistence(timeout: 20), "Native EventKit request should finish without error")
        app.buttons["Close"].firstMatch.tap()
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "roadmap-native-ios"; attachment.lifetime = .keepAlways; add(attachment)
        app.terminate()
    }

    func testSearchDismissal() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        let files = ["Welcome.md": "# Welcome\n\nSearch test fixture.\n"]
        app.launchEnvironment = ["MERKZEUG_DEMO_MODE": "1", "MERKZEUG_DEMO_FILES": String(data: try JSONSerialization.data(withJSONObject: files), encoding: .utf8)!, "MERKZEUG_DEMO_NOTE": "/Welcome.md", "MERKZEUG_DEMO_LOCALE": "en"]
        app.launch()
        XCTAssertTrue(app.otherElements["merkzeug-screenshot-ready"].waitForExistence(timeout: 60))
        if app.buttons["Later"].exists { app.buttons["Later"].tap() }
        let search = app.buttons["🔍"]
        let input = app.descendants(matching: .any).matching(NSPredicate(format: "placeholderValue == %@", "Search vault …")).firstMatch
        for populated in [false, true] {
            search.tap()
            XCTAssertTrue(input.waitForExistence(timeout: 5))
            if populated { input.tap(); input.typeText("Welcome") }
            app.webViews.buttons["Done"].tap()
            XCTAssertTrue(input.waitForNonExistence(timeout: 5), "Done closes search with and without a query")
        }
        search.tap()
        XCTAssertTrue(input.waitForExistence(timeout: 5))
        input.tap()
        input.typeText("\n")
        XCTAssertTrue(input.waitForNonExistence(timeout: 5), "Keyboard Done closes an empty search")
        app.terminate()
    }

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
        for scene in ["writing", "diagram", "git", "frontmatter"] {
            app.launchEnvironment["MERKZEUG_DEMO_NOTE"] = ["diagram", "git"].contains(scene) ? (locale == "de" ? "/Projekte/Garten.md" : "/Projects/Garden.md") : (locale == "de" ? "/Willkommen.md" : "/Welcome.md")
            app.launchEnvironment["MERKZEUG_DEMO_SCENE"] = scene
            app.launch()
            if app.buttons["Later"].waitForExistence(timeout: 3) { app.buttons["Later"].tap() }
            else if app.buttons["Später"].exists { app.buttons["Später"].tap() }
            XCTAssertTrue(app.otherElements["merkzeug-screenshot-ready"].waitForExistence(timeout: 60), "Editor, fonts and diagram must finish rendering")
            let raw = app.screenshot()
            let edition = UIDevice.current.userInterfaceIdiom == .pad ? "ipad" : "iphone"
            let name = "\(edition)-\(locale)-\(scene)"
            let attachment = XCTAttachment(screenshot: raw)
            attachment.name = "raw-" + name; attachment.lifetime = .keepAlways; add(attachment)
            let caption = try XCTUnwrap(captions[locale]?[scene == "git" ? "repository" : scene])
            let framed = try ScreenshotFrame.render(try XCTUnwrap(raw.image.cgImage), title: caption.title, subtitle: caption.subtitle)
            let store = XCTAttachment(data: framed, uniformTypeIdentifier: "public.png")
            store.name = "store-" + name; store.lifetime = .keepAlways; add(store)
            app.terminate()
        }
    }
    private struct Caption: Decodable { let title: String; let subtitle: String }
}
