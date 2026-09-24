import XCTest
import UIKit

final class ScreenshotTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    func testEnglish() throws { try capture(locale: "en") }
    func testGerman() throws { try capture(locale: "de") }

    func testPDFExport() throws { try verifyPDFExport(combined: true) }
    func testSinglePDFExport() throws { try verifyPDFExport(combined: false) }

    private func dismissReleaseNotes(in app: XCUIApplication) {
        let close = app.buttons["Close release notes"]
        guard close.waitForExistence(timeout: 30) else { return }
        let proof = XCTAttachment(screenshot: app.screenshot())
        proof.name = "First-launch release notes"; proof.lifetime = .keepAlways; add(proof)
        // WKWebView's semantic tap can miss this button on iOS 27; use its visible center.
        close.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertTrue(close.waitForNonExistence(timeout: 5))
    }

    private func verifyPDFExport(combined: Bool) throws {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        let files = [
            "Welcome.md": "---\ntitle: Single title\npdf-linked-title: Combined title\npdf-toc: true\nlanguage: en\npdf-exclude: [Hidden.md]\n---\n# Index note\n\n[Chapter](Chapter.md) [Excluded](Hidden.md)\n",
            "Chapter.md": "# Included chapter\n\nCombined document body.\n",
            "Hidden.md": "# Excluded secret\n"
        ]
        let templates = ["Acceptance/stil.css": ".pdf-content { color: #173c55; }", "Acceptance/deckblatt.html": "<h1>Cover {{titel}}</h1>", "Acceptance/kopfzeile.html": "<div>Header {{titel}}</div>"]
        app.launchEnvironment = ["MERKZEUG_PRINT_PROOF": "1", "MERKZEUG_DEMO_MODE": "1", "MERKZEUG_DEMO_FILES": String(data: try JSONSerialization.data(withJSONObject: files), encoding: .utf8)!, "MERKZEUG_DEMO_TEMPLATES": String(data: try JSONSerialization.data(withJSONObject: templates), encoding: .utf8)!, "MERKZEUG_DEMO_NOTE": "/Welcome.md"]
        app.launch()
        dismissReleaseNotes(in: app)
        if app.buttons["Start tour"].waitForExistence(timeout: 10) { app.buttons.matching(identifier: "Later").allElementsBoundByIndex.last?.tap() }
        let open = app.buttons["PDF / Print…"]
        XCTAssertTrue(open.waitForExistence(timeout: 60), app.debugDescription)
        open.tap()
        XCTAssertTrue(app.staticTexts["Cover Single title"].waitForExistence(timeout: 30), app.debugDescription)
        if combined {
            let linked = app.switches.matching(NSPredicate(format: "label CONTAINS %@", "Include linked documents")).firstMatch
            XCTAssertTrue(linked.waitForExistence(timeout: 10), app.debugDescription)
            linked.tap()
            XCTAssertTrue(app.staticTexts["Cover Combined title"].waitForExistence(timeout: 30), app.debugDescription)
        }
        let export = app.buttons["Export as PDF…"]
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: export)
        waitForExpectations(timeout: 60)
        export.tap()
        XCTAssertTrue(app.cells["Copy"].waitForExistence(timeout: 30), app.debugDescription)
        let proof = XCTAttachment(screenshot: app.screenshot())
        proof.name = "PDF export share sheet"; proof.lifetime = .keepAlways; add(proof)
        app.terminate()
    }

    func testTemplates() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        let files = ["Welcome.md": "# Template acceptance\n\nA styled note.\n\n```mermaid\nflowchart LR\n A --> B\n```\n"]
        let templates = ["Acceptance/stil.css": ".pdf-content { background: #fff8e8; color: #173c55; } .pdf-content .milkdown .ProseMirror h1 { font-family: Georgia; color: #173c55; }", "Acceptance/deckblatt.html": "<h1>Template cover acceptance</h1>"]
        app.launchEnvironment = ["MERKZEUG_DEMO_MODE": "1", "MERKZEUG_DEMO_FILES": String(data: try JSONSerialization.data(withJSONObject: files), encoding: .utf8)!, "MERKZEUG_DEMO_TEMPLATES": String(data: try JSONSerialization.data(withJSONObject: templates), encoding: .utf8)!, "MERKZEUG_DEMO_NOTE": "/Welcome.md"]
        app.launch()
        dismissReleaseNotes(in: app)
        if app.buttons["Start tour"].waitForExistence(timeout: 10) { app.buttons.matching(identifier: "Later").allElementsBoundByIndex.last?.tap() }
        let settings = app.descendants(matching: .any).matching(identifier: "PDF templates").firstMatch
        XCTAssertTrue(settings.waitForExistence(timeout: 60), app.debugDescription)
        settings.tap()
        let checkbox = app.descendants(matching: .any).matching(identifier: "Use PDF template while editing").firstMatch
        XCTAssertTrue(checkbox.waitForExistence(timeout: 10), app.debugDescription)
        if (checkbox.value as? String) != "1" { checkbox.tap() }
        XCTAssertEqual(checkbox.value as? String, "1", app.debugDescription)
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "iOS template styles"; screenshot.lifetime = .keepAlways; add(screenshot)
        settings.tap()
        app.buttons["PDF / Print…"].tap()
        XCTAssertTrue(app.staticTexts["Template cover acceptance"].waitForExistence(timeout: 30), app.debugDescription)
        let preview = XCTAttachment(screenshot: app.screenshot())
        preview.name = "iOS template print preview"; preview.lifetime = .keepAlways; add(preview)
        app.buttons["Close"].tap()
        app.terminate()
    }

    func testPrinting() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        let files = ["Welcome.md": "# Print acceptance\n\nSaved content for printing.\n\n```mermaid\nflowchart LR\n A --> B\n```\n"]
        app.launchEnvironment = ["MERKZEUG_DEMO_MODE": "1", "MERKZEUG_DEMO_FILES": String(data: try JSONSerialization.data(withJSONObject: files), encoding: .utf8)!, "MERKZEUG_DEMO_NOTE": "/Welcome.md"]
        app.launch()
        dismissReleaseNotes(in: app)
        if app.buttons["Start tour"].waitForExistence(timeout: 10) { app.buttons.matching(identifier: "Later").allElementsBoundByIndex.last?.tap() }
        XCTAssertTrue(app.buttons["PDF / Print…"].waitForExistence(timeout: 60))
        app.buttons["PDF / Print…"].tap()
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

    func testTemplatePrinting() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        let paragraphs = (1...65).map { "Paragraph \($0): Native template pagination acceptance." }.joined(separator: "\n\n")
        let templates = ["Acceptance/kopfzeile.html": "<div style=\"font:16px Arial;color:#28568f\">Native header: {{titel}}</div>", "Acceptance/fusszeile.html": "<div style=\"font:14px Arial;color:#28568f\">Page <span class=\"pageNumber\"></span> of <span class=\"totalPages\"></span></div>", "Acceptance/vorlage.json": "{\"margins\":{\"top\":30,\"bottom\":24,\"left\":15,\"right\":15}}"]
        let files = ["Welcome.md": "# Print acceptance\n\nSaved content for printing.\n\n```mermaid\nflowchart LR\n A --> B\n```\n" + paragraphs]
        app.launchEnvironment = ["MERKZEUG_PRINT_PROOF": "1", "MERKZEUG_DEMO_TEMPLATES": String(data: try JSONSerialization.data(withJSONObject: templates), encoding: .utf8)!, "MERKZEUG_DEMO_MODE": "1", "MERKZEUG_DEMO_FILES": String(data: try JSONSerialization.data(withJSONObject: files), encoding: .utf8)!, "MERKZEUG_DEMO_NOTE": "/Welcome.md"]
        app.launch()
        dismissReleaseNotes(in: app)
        if app.buttons["Start tour"].waitForExistence(timeout: 10) { app.buttons.matching(identifier: "Later").allElementsBoundByIndex.last?.tap() }
        XCTAssertTrue(app.buttons["PDF / Print…"].waitForExistence(timeout: 60))
        app.buttons["PDF / Print…"].tap()
        let printButton = app.buttons["Print…"]
        XCTAssertTrue(printButton.waitForExistence(timeout: 30))
        let ready = NSPredicate(format: "enabled == true")
        expectation(for: ready, evaluatedWith: printButton)
        waitForExpectations(timeout: 60)
        printButton.tap()
        let cancel = app.buttons["Cancel"].firstMatch
        XCTAssertTrue(cancel.waitForExistence(timeout: 20), app.debugDescription)
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "AirPrint with template headers and footers"; screenshot.lifetime = .keepAlways; add(screenshot)
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
        dismissReleaseNotes(in: app)
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
        dismissReleaseNotes(in: app)
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
        dismissReleaseNotes(in: app)
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
