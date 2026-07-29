# Diagramme

Mermaid-Codeblöcke werden als Diagramm angezeigt. Ein Klick auf das Diagramm
öffnet den Quelltext; verlässt der Cursor den Block, wird wieder gerendert.

```mermaid
flowchart TD
    A[Notiz schreiben] --> B{Mermaid-Block?}
    B -->|Ja| C[Diagramm rendern]
    B -->|Nein| D[Normaler Text]
    C --> E[Klick öffnet den Code]
```

Auch Sequenzdiagramme funktionieren:

```mermaid
sequenceDiagram
    participant E as Editor
    participant R as Renderer
    E->>R: Mermaid-Quelltext
    R-->>E: Diagramm als Bild
```
