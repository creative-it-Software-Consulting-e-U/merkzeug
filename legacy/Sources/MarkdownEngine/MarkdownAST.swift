import Foundation

public indirect enum MDInline: Equatable {
    case text(String)
    case strong([MDInline])
    case emphasis([MDInline])
    case strikethrough([MDInline])
    case code(String)
    case link(text: [MDInline], url: String)
    case image(alt: String, path: String)
}

public enum MDBlock: Equatable {
    case heading(level: Int, inlines: [MDInline])
    case paragraph([MDInline])
    case codeBlock(language: String, text: String)
    case quote(paragraphs: [[MDInline]])
    case listItem(depth: Int, ordered: Bool, number: Int, inlines: [MDInline])
    case table(rows: [[[MDInline]]])
    case thematicBreak
}
