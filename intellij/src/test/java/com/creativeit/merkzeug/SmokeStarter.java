package com.creativeit.merkzeug;

import com.google.gson.*;
import com.intellij.openapi.application.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.vfs.*;
import com.intellij.openapi.fileEditor.*;
import com.intellij.openapi.editor.Document;
import com.intellij.ui.jcef.*;
import java.nio.file.*;
import java.util.*;
import javax.swing.*;

/** Test-only starter; never included in the distributable plugin. */
public final class SmokeStarter implements ApplicationStarter {
    @Override public boolean isHeadless() { return false; }
    @Override public int getRequiredModality() { return NOT_IN_EDT; }
    @Override public void main(List<String> args) {
        try {
            String prompt = MerkzeugSettings.stylingPrompt("/tmp/My templates/$1");
            if (!prompt.contains("/tmp/My templates/$1") || prompt.contains("{{TEMPLATE_PATH}}") || !prompt.contains("Editor preview versus PDF")) throw new AssertionError("Incomplete template styling prompt");
        } catch (java.io.IOException e) { throw new RuntimeException(e); }

        Path test = Paths.get(System.getProperty("merkzeug.smoke.root"));
        com.intellij.ide.trustedProjects.TrustedProjects.setProjectTrusted(test, true);
        Project project = com.intellij.openapi.project.ex.ProjectManagerEx.getInstanceEx().openProject(test,
            com.intellij.ide.impl.OpenProjectTask.build().asNewProject().withForceOpenInNewFrame(true));
        if (project == null) throw new AssertionError("Test project failed to open");
        try { testCompanionRefactoring(project, test); }
        catch (Throwable failure) { failure.printStackTrace(); System.exit(1); }
        ApplicationManager.getApplication().invokeLater(() -> {
            try {
                VirtualFile file = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(test.resolve("index.md"));
                if (file == null) throw new AssertionError("Fixture not found");
                Path discoveryRoot = Files.createTempDirectory(test, "desktop-discovery-");
                Path desktopProfile = Files.createDirectories(discoveryRoot.resolve("merkzeug"));
                Path defaultTemplate = Files.createDirectories(desktopProfile.resolve("PDF-Vorlagen/Default"));
                Files.writeString(defaultTemplate.resolve("stil.css"), ".pdf-content { color: black; }");
                var defaults = DesktopTemplates.discover(List.of(desktopProfile), null);
                if (defaults.templates().size() != 1 || defaults.unreadable()) throw new AssertionError("Default desktop templates not discovered");
                Path customRoot = Files.createDirectories(discoveryRoot.resolve("Shared templates"));
                Path customTemplate = Files.createDirectories(customRoot.resolve("Company"));
                Files.writeString(customTemplate.resolve("vorlage.json"), "{}");
                Files.createDirectories(customRoot.resolve("Unrelated directory"));
                var desktopConfig = new JsonObject(); desktopConfig.addProperty("templatesRoot", customRoot.toString());
                Files.writeString(desktopProfile.resolve("settings.json"), desktopConfig.toString());
                var custom = DesktopTemplates.discover(List.of(desktopProfile, desktopProfile), customRoot.toString());
                if (custom.templates().size() != 1 || !custom.templates().get(0).directory().equals(customTemplate.toRealPath())) throw new AssertionError("Custom templates or deduplication failed");
                Files.writeString(desktopProfile.resolve("settings.json"), "invalid json");
                var broken = DesktopTemplates.discover(List.of(desktopProfile), null);
                if (!broken.unreadable() || broken.templates().size() != 1) throw new AssertionError("Invalid settings fallback failed");
                if (!DesktopTemplates.discover(List.of(discoveryRoot.resolve("absent")), null).templates().isEmpty()) throw new AssertionError("Missing installation should be empty");
                if (!DesktopTemplates.profiles("Linux", discoveryRoot, java.util.Map.of("XDG_CONFIG_HOME", customRoot.toString())).get(0).equals(customRoot.resolve("merkzeug"))) throw new AssertionError("XDG location failed");
                if (!DesktopTemplates.profiles("Windows 11", discoveryRoot, java.util.Map.of("APPDATA", customRoot.toString())).get(0).equals(customRoot.resolve("merkzeug"))) throw new AssertionError("Windows location failed");
                if (!DesktopTemplates.profiles("Mac OS X", discoveryRoot, java.util.Map.of()).get(0).equals(discoveryRoot.resolve("Library/Application Support/merkzeug"))) throw new AssertionError("macOS location failed");
                System.out.println("MERKZEUG_SMOKE desktop template discovery: default, custom, deduplication, missing, malformed and platform paths passed");
                var settings = new MerkzeugSettings(project);
                var settingsPanel = settings.createComponent();
                if (settings.isModified()) throw new AssertionError("Fresh settings are modified");
                var folderField = MerkzeugSettings.class.getDeclaredField("folder"); folderField.setAccessible(true);
                var folderInput = (com.intellij.openapi.ui.TextFieldWithBrowseButton) folderField.get(settings);
                var desktopField = MerkzeugSettings.class.getDeclaredField("desktop"); desktopField.setAccessible(true);
                @SuppressWarnings("unchecked") var desktopChoice = (javax.swing.JComboBox<Object>) desktopField.get(settings);
                desktopChoice.addItem(custom.templates().get(0)); desktopChoice.setSelectedIndex(1);
                if (!folderInput.getText().equals(customTemplate.toRealPath().toString())) throw new AssertionError("Desktop selection did not set template folder");
                settings.reset();
                folderInput.setText(test.toString());
                var stylingClosed = new java.util.concurrent.atomic.AtomicBoolean();
                javax.swing.Timer closeStyling = new javax.swing.Timer(150, event -> {
                    for (java.awt.Window window : java.awt.Window.getWindows()) {
                        if (window instanceof javax.swing.JDialog dialog && dialog.isShowing() && Messages.text("Template styling prompt").equals(dialog.getTitle())) {
                            if (clickButton(dialog, Messages.text("Close"))) stylingClosed.set(true);
                        }
                    }
                });
                closeStyling.start();
                try {
                    if (!clickButton(settingsPanel, Messages.text("Template styling prompt"))) throw new AssertionError("Missing styling action");
                    if (!stylingClosed.get() || !folderInput.getText().equals(test.toString())) throw new AssertionError("Styling dialog did not preserve settings");
                } finally { closeStyling.stop(); }
                System.out.println("MERKZEUG_SMOKE native styling prompt preview and close passed");

                if (!settings.isModified()) throw new AssertionError("Settings edit not detected");
                settings.apply();
                if (!test.toString().equals(com.intellij.ide.util.PropertiesComponent.getInstance(project).getValue("merkzeug.templateDirectory"))) throw new AssertionError("Project template not stored");
                folderInput.setText(test.resolve("missing-template-directory").toString());
                try { settings.apply(); throw new AssertionError("Missing template directory accepted"); }
                catch (com.intellij.openapi.options.ConfigurationException expected) { }
                settings.reset();
                if (!folderInput.getText().equals(test.toString())) throw new AssertionError("Settings reset failed");
                folderInput.setText("");
                settings.apply();
                if (com.intellij.ide.util.PropertiesComponent.getInstance(project).getValue("merkzeug.templateDirectory") != null) throw new AssertionError("Template not cleared");
                settings.disposeUIResources();
                System.out.println("MERKZEUG_SMOKE project settings lifecycle passed");
                Files.writeString(test.resolve("AGENTS.md"), "# Project instructions\nFollow project conventions.\n");
                Files.writeString(test.resolve("CLAUDE.md"), "See AGENTS.md for all instructions.\n");
                for (String name : List.of("AGENTS.md", "CLAUDE.md")) {
                    var instructionFile = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(test.resolve(name));
                    com.intellij.openapi.fileEditor.impl.NonProjectFileWritingAccessProvider.allowWriting(List.of(instructionFile));
                }
                Files.writeString(test.resolve("stil.css"), ".pdf-content .milkdown .ProseMirror p { font-size: 31px; color: #232323; } header { font-size: 99px; }");
                com.intellij.ide.util.PropertiesComponent.getInstance(project).setValue("merkzeug.templateDirectory", test.toString());
                MerkzeugEditor editor = new MerkzeugEditor(project, file);
                var scopeMethod = MerkzeugEditor.class.getDeclaredMethod("chooseExportScope", JsonObject.class);
                scopeMethod.setAccessible(true);
                JsonObject scopeRequest = new JsonObject();
                var linkedPaths = new com.google.gson.JsonArray(); linkedPaths.add(file.getPath());
                scopeRequest.add("paths", linkedPaths);
                String[] scopeLabels = {"Only this document", "Include linked documents", "Cancel"};
                for (int choice = 0; choice < scopeLabels.length; choice++) {
                    String label = Messages.text(scopeLabels[choice]);
                    javax.swing.Timer click = new javax.swing.Timer(150, event -> {
                        for (java.awt.Window dialog : java.awt.Window.getWindows()) {
                            if (dialog instanceof javax.swing.JDialog && dialog.isShowing() && clickButton((java.awt.Container) dialog, label)) {
                                ((javax.swing.Timer) event.getSource()).stop(); break;
                            }
                        }
                    });
                    click.start();
                    int actual;
                    try { actual = (Integer) scopeMethod.invoke(editor, scopeRequest); }
                    finally { click.stop(); }
                    if (actual != choice) throw new AssertionError("Wrong PDF scope choice: " + actual);
                }
                System.out.println("MERKZEUG_SMOKE native PDF scope choices and cancellation passed");
                com.intellij.openapi.actionSystem.DataContext printContext = key ->
                    com.intellij.openapi.actionSystem.PlatformDataKeys.FILE_EDITOR.is(key) ? editor : null;
                if (!(com.intellij.ide.actions.PrintActionHandler.getHandler(printContext) instanceof MerkzeugPrintHandler)) throw new AssertionError("Native Print action does not select Merkzeug");
                if (new MerkzeugPrintHandler().canPrint(key -> null)) throw new AssertionError("Print handler must not claim other editors");
                System.out.println("MERKZEUG_SMOKE native Print handler selection passed");
                JFrame window = new JFrame("Merkzeug integration test");
                window.setContentPane(editor.getComponent()); window.setSize(1050, 900); window.setVisible(true);
                var browserField = MerkzeugEditor.class.getDeclaredField("browser"); browserField.setAccessible(true);
                JBCefBrowser browser = (JBCefBrowser) browserField.get(editor);
                var statusReady = new java.util.concurrent.atomic.AtomicBoolean(false);
                browser.getJBCefClient().getCefClient().addDisplayHandler(new org.cef.handler.CefDisplayHandlerAdapter() {
                    @Override public boolean onConsoleMessage(org.cef.browser.CefBrowser b, org.cef.CefSettings.LogSeverity level, String message, String source, int line) {
                        if ("MERKZEUG_INITIAL_READY".equals(message)) statusReady.set(true);
                        System.out.println("MERKZEUG_BROWSER " + level + " " + message); return false;
                    }
                });
                javax.swing.Timer statusTimer = new javax.swing.Timer(500, event -> {
                    browser.getCefBrowser().executeJavaScript("(() => { const status = document.querySelector('.status')?.textContent; if (document.querySelectorAll('.format-toolbar > button').length === 14 && document.querySelectorAll('.format-toolbar details').length === 2 && !document.querySelector('.theme-select, .meeting-notes') && document.querySelector('.ProseMirror') && ['Synced with IntelliJ', 'Mit IntelliJ synchronisiert'].includes(status)) { console.log('MERKZEUG_INITIAL_READY'); } })()", browser.getCefBrowser().getURL(), 0);
                    if (statusReady.get()) ((javax.swing.Timer) event.getSource()).stop();
                });
                statusTimer.start();
                var dispatch = MerkzeugEditor.class.getDeclaredMethod("dispatch", JsonObject.class); dispatch.setAccessible(true);
                Document document = FileDocumentManager.getInstance().getDocument(file);
                com.intellij.openapi.fileEditor.impl.NonProjectFileWritingAccessProvider.allowWriting(List.of(file));
                String original = document.getText();
                JsonObject write = new JsonObject(); write.addProperty("id", 9000); write.addProperty("method", "write"); write.addProperty("path", file.getPath()); write.addProperty("revision", Long.toString(document.getModificationStamp())); write.addProperty("text", original + "\nNative document synchronization verified.\n");
                dispatch.invoke(editor, write);
                if (!document.getText().contains("synchronization verified")) throw new AssertionError("Document write failed");
                String edited = document.getText();
                write.addProperty("text", "STALE DATA MUST NEVER WIN"); dispatch.invoke(editor, write);
                if (!document.getText().equals(edited)) throw new AssertionError("Stale edit overwrote document");
                var undo = com.intellij.openapi.command.undo.UndoManager.getInstance(project);
                if (!undo.isUndoAvailable(editor)) throw new AssertionError("Undo not available");
                undo.undo(editor);
                if (!document.getText().equals(original)) throw new AssertionError("Undo failed");
                if (!undo.isRedoAvailable(editor)) throw new AssertionError("Redo not available");
                undo.redo(editor);
                if (!document.getText().equals(edited)) throw new AssertionError("Redo failed");
                FileDocumentManager.getInstance().saveDocument(document);
                if (!Files.readString(test.resolve("index.md")).equals(edited)) throw new AssertionError("Save failed: expected=" + edited + " ACTUAL=" + Files.readString(test.resolve("index.md")));
                System.out.println("MERKZEUG_SMOKE document-write, stale-revision, undo, redo and save passed");
                javax.swing.Timer timer = new javax.swing.Timer(500, e -> {
                    try {
                        if (!statusReady.get()) return;
                        if (!Files.readString(test.resolve("AGENTS.md")).contains("## Merkzeug:")) {
                            browser.getCefBrowser().executeJavaScript("""
                                (() => {
                                  if (!document.querySelector('.editor-extras')) { document.querySelector('button[aria-label="Merkzeug"]').click(); return; }
                                  const toggle = document.querySelector('.template-preview-toggle input');
                                  const paragraph = document.querySelector('.editor-root p');
                                  const checkCellSelection = () => {
                                    const cell = document.querySelector('.editor-root td');
                                    if (!cell) throw new Error('Missing table selection fixture');
                                    const text = cell.querySelector('p') || cell;
                                    cell.classList.add('selectedCell');
                                    const range = document.createRange(); range.selectNodeContents(text);
                                    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
                                    const normal = getComputedStyle(text).color;
                                    const selected = getComputedStyle(text, '::selection');
                                    if (selected.color !== normal || selected.backgroundColor !== 'rgba(0, 0, 0, 0)') throw new Error('Unreadable cell selection: ' + selected.color + ' vs ' + normal);
                                    for (const link of cell.querySelectorAll('a')) {
                                      if (getComputedStyle(link, '::selection').color !== getComputedStyle(link).color) throw new Error('Selected link lost its color');
                                    }
                                    selection.removeAllRanges(); cell.classList.remove('selectedCell');
                                    console.log('MERKZEUG_TABLE_SELECTION_PASSED ' + normal);
                                  };

                                  if (!window.previewTestStage) {
                                    const svg = document.querySelector('.mermaid-preview svg'); if (!svg) return;
                                    checkCellSelection();
                                    window.__merkzeugTheme({ dark: true, choice: 'system' });
                                    window.previewOriginalSvg = svg.id;
                                    window.previewTestStage = -1; return;
                                  }
                                  if (window.previewTestStage === -1) {
                                    const svg = document.querySelector('.mermaid-preview svg');
                                    if (!svg || svg.id === window.previewOriginalSvg) return;
                                    window.previewDarkFill = getComputedStyle(svg.querySelector('.node rect')).fill;
                                    window.previewDarkSvg = svg.id;
                                    window.previewHeaderFont = getComputedStyle(document.querySelector('header')).fontSize; toggle.click(); window.previewTestStage = 1; return; }
                                  if (window.previewTestStage === 1) {
                                    if (!document.querySelector('.template-live')) return;
                                    if (getComputedStyle(paragraph).fontSize !== '31px' || getComputedStyle(document.querySelector('header')).fontSize !== window.previewHeaderFont) throw new Error('Template style scope incorrect');
                                    const svg = document.querySelector('.mermaid-preview svg');
                                    if (!svg || svg.id === window.previewDarkSvg) return;
                                    const fill = getComputedStyle(svg.querySelector('.node rect')).fill;
                                    if (fill === window.previewDarkFill) throw new Error('Mermaid stayed dark during template preview');
                                    let backdrop = svg;
                                    while (backdrop && ['rgba(0, 0, 0, 0)', 'transparent'].includes(getComputedStyle(backdrop).backgroundColor)) backdrop = backdrop.parentElement;
                                    if (!backdrop || getComputedStyle(backdrop).backgroundColor !== 'rgb(255, 255, 255)') throw new Error('Mermaid is not rendered on the light PDF paper surface');
                                    checkCellSelection();
                                    window.previewLightSvg = svg.id;
                                    toggle.click(); window.previewTestStage = 2; return;
                                  }
                                  if (window.previewTestStage === 2) {
                                    if (document.querySelector('.template-live')) return;
                                    if (getComputedStyle(paragraph).fontSize === '31px') throw new Error('Template style not removed');
                                    const svg = document.querySelector('.mermaid-preview svg');
                                    if (!svg || svg.id === window.previewLightSvg) return;
                                    if (getComputedStyle(svg.querySelector('.node rect')).fill !== window.previewDarkFill) throw new Error('Mermaid did not restore the IDE theme');
                                    checkCellSelection();
                                    window.previewTestStage = 3; console.log('MERKZEUG_TEMPLATE_PREVIEW_PASSED');
                                  }
                                  const actions = [...document.querySelectorAll('.editor-extra-actions > button, .editor-extra-actions .tour-tools > button')];
                                  if (actions.length !== (document.querySelector('.tour-tools') ? 3 : 1) || actions.some(b => Math.abs(b.getBoundingClientRect().top - actions[0].getBoundingClientRect().top) > 1 || getComputedStyle(b).fontSize !== getComputedStyle(actions[0]).fontSize)) throw new Error('Extra actions are not aligned or use different font sizes');
                                  if (document.querySelector('.vault-guidance').getBoundingClientRect().top < actions[0].getBoundingClientRect().bottom) throw new Error('Guidance must occupy its own row');
                                  const dialog = document.querySelector('.guidance-dialog');
                                  if (!dialog) { document.querySelector('.vault-guidance > button')?.click(); return; }
                                  const boxes = dialog.querySelectorAll('input[type=checkbox]');
                                  const add = [...dialog.querySelectorAll('button')].find(b => ['Add', 'Hinzufügen'].includes(b.textContent));
                                  if (!window.guidanceTestSelected) {
                                    if (boxes.length !== 2 || [...boxes].some(b => b.checked) || !add.disabled || dialog.querySelectorAll('pre').length !== 3 || !dialog.textContent.includes('See AGENTS.md for all instructions.')) throw new Error('Guidance preview or defaults incorrect');
                                    boxes[0].click(); window.guidanceTestSelected = true; return;
                                  }
                                  if (boxes[0].checked && !boxes[1].checked && !add.disabled) add.click();
                                })()
                                """, browser.getCefBrowser().getURL(), 0);
                            return;
                        }
                        if (!Files.readString(test.resolve("CLAUDE.md")).equals("See AGENTS.md for all instructions.\n")) throw new AssertionError("Unselected CLAUDE.md was modified");
                        System.out.println("MERKZEUG_SMOKE guidance preview and explicit AGENTS-only selection passed");
                        ((javax.swing.Timer) e.getSource()).stop();
                        JsonObject payload = JsonParser.parseString(Files.readString(test.resolve("payload.json"))).getAsJsonObject();
                        var payloadField = MerkzeugEditor.class.getDeclaredField("pdfPayload"); payloadField.setAccessible(true); payloadField.set(editor, payload);
                        var targetField = MerkzeugEditor.class.getDeclaredField("pdfTarget"); targetField.setAccessible(true); targetField.set(editor, test.resolve("actual.pdf"));
                        var originField = MerkzeugEditor.class.getDeclaredField("origin"); originField.setAccessible(true);
                        browser.loadURL(originField.get(editor) + "index.html?pdf");
                    } catch (Exception error) { error.printStackTrace(); System.exit(1); }
                });
                timer.start();
                ApplicationManager.getApplication().executeOnPooledThread(() -> {
                    try {
                        for (int n = 0; n < 120; n++) {
                            Thread.sleep(1000);
                            Path pdf = test.resolve("actual.pdf");
                            if (Files.exists(pdf) && Files.size(pdf) > 1000) {
                                System.out.println("MERKZEUG_SMOKE PDF written: " + Files.size(pdf));
                                Files.writeString(test.resolve("passed.txt"), "Document write, stale revision rejection, undo, redo, JCEF PDF export passed\n");
                                System.exit(0);
                            }
                        }
                        System.err.println("MERKZEUG_SMOKE timeout"); System.exit(1);
                    } catch (Exception error) { error.printStackTrace(); System.exit(1); }
                });
            } catch (Throwable error) { error.printStackTrace(); System.exit(1); }
        });
    }
    private static void testCompanionRefactoring(Project project, Path test) throws Exception {
        String rewritten = MarkdownLinkRefactoring.rewrite("![x](Plan.assets/x.png) ![x](./Plan.assets/x.png) ![other](OtherPlan.assets/x.png) ![remote](../Other/Plan.assets/x.png)", "/v/Note.md", java.util.List.of(new MarkdownLinkRefactoring.Move("/v/Plan.assets", "/v/Draft Note.assets")), "/v");
        if (!rewritten.equals("![x](Draft%20Note.assets/x.png) ![x](./Draft%20Note.assets/x.png) ![other](OtherPlan.assets/x.png) ![remote](../Other/Plan.assets/x.png)")) throw new AssertionError("Companion reference escaping or boundaries failed");
        String codeFixture = "```md\n[x](Plan.md)\n```\n";
        if (!MarkdownLinkRefactoring.rewrite(codeFixture, "/v/Index.md", java.util.List.of(new MarkdownLinkRefactoring.Move("/v/Plan.md", "/v/Draft.md")), "/v").equals(codeFixture)) throw new AssertionError("Parser changes code");
        Path base = Files.createTempDirectory(test, "refactoring-");
        Files.createDirectories(base.resolve("Plan.assets"));
        Files.writeString(base.resolve("Plan.assets/image.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"/>");
        Files.writeString(base.resolve("Plan.md"), "![Image](Plan.assets/image.svg)\n[Other](Other.md#topic)\n");
        Files.writeString(base.resolve("Other.md"), "# Other\n");
        Files.writeString(base.resolve("Backlinks.md"), "[Plan](Plan.md#topic)\n![Shared](Plan.assets/image.svg)\n\n[ref]: Plan.md \"Title\"\n\n`[Code](Plan.md)`\n\n```md\n[Code](Plan.md)\n```\n");
        Files.createDirectories(base.resolve("folder"));
        Files.writeString(base.resolve("folder/Inner.md"), "[Outside](../Other.md)\n");
        Files.writeString(base.resolve("FolderLink.md"), "[Inside](folder/Inner.md)\n");
        Files.createDirectories(base.resolve("assets"));
        Files.writeString(base.resolve("assets/shared.txt"), "shared");
        Files.createDirectories(base.resolve("target"));
        ApplicationManager.getApplication().invokeAndWait(() -> com.intellij.openapi.application.WriteAction.run(() -> {
            var module = com.intellij.openapi.module.ModuleManager.getInstance(project).newModule(base.resolve("fixture.iml"), "EMPTY_MODULE");
            com.intellij.openapi.roots.ModuleRootModificationUtil.addContentRoot(module, base.toString());
        }));
        VirtualFile root = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(base);
        root.refresh(false, true);
        ApplicationManager.getApplication().invokeAndWait(() -> {
            var writable = new ArrayList<VirtualFile>();
            com.intellij.openapi.vfs.VfsUtilCore.visitChildrenRecursively(root, new com.intellij.openapi.vfs.VirtualFileVisitor<Void>() {
                @Override public boolean visitFile(VirtualFile file) { writable.add(file); return true; }
            });
            com.intellij.openapi.fileEditor.impl.NonProjectFileWritingAccessProvider.allowWriting(writable);
        });
        com.intellij.openapi.project.DumbService.getInstance(project).waitForSmartMode();
        var renamed = new java.util.concurrent.CountDownLatch(1);
        ApplicationManager.getApplication().invokeAndWait(() -> {
            var psi = com.intellij.psi.PsiManager.getInstance(project).findFile(root.findChild("Plan.md"));
            if (!(com.intellij.refactoring.rename.RenamePsiElementProcessor.forElement(psi) instanceof CompanionRenameProcessor)) throw new AssertionError("Companion rename processor not registered");
            var processor = new com.intellij.refactoring.rename.RenameProcessor(project, psi, "Draft.md", false, false) {
                @Override public void performRefactoring(com.intellij.usageView.UsageInfo[] usages) { super.performRefactoring(usages); renamed.countDown(); }
            };
            processor.setPreviewUsages(false); processor.run();
        });
        if (!renamed.await(45, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Native rename timed out");
        ApplicationManager.getApplication().invokeAndWait(() -> FileDocumentManager.getInstance().saveAllDocuments());
        if (!Files.exists(base.resolve("Draft.assets/image.svg")) || Files.exists(base.resolve("Plan.assets"))) throw new AssertionError("Rename did not pair attachments");
        if (!Files.readString(base.resolve("Draft.md")).contains("Draft.assets/image.svg")) throw new AssertionError("Rename did not update Markdown image link");
        String backlinks = Files.readString(base.resolve("Backlinks.md"));
        if (!backlinks.contains("[Plan](Draft.md#topic)") || !backlinks.contains("![Shared](Draft.assets/image.svg)") || !backlinks.contains("[ref]: Draft.md")) throw new AssertionError("Incoming rename links not updated: " + backlinks);
        if (!backlinks.contains("`[Code](Plan.md)`") || !backlinks.contains("```md\n[Code](Plan.md)")) throw new AssertionError("Code example changed");
        undoRefactoring(project, false);
        if (!Files.readString(base.resolve("Backlinks.md")).contains("[Plan](Plan.md#topic)")) throw new AssertionError("Incoming link undo failed");
        if (!Files.exists(base.resolve("Plan.md")) || !Files.exists(base.resolve("Plan.assets/image.svg"))) throw new AssertionError("Rename undo did not restore pair");
        undoRefactoring(project, true);
        Files.createDirectories(base.resolve("Collision.assets")); root.refresh(false, true);
        ApplicationManager.getApplication().invokeAndWait(() -> {
            var psi = com.intellij.psi.PsiManager.getInstance(project).findFile(root.findChild("Draft.md"));
            if (CompanionAssets.companion(psi) == null) throw new AssertionError("Missing companion after redo: " + psi + " " + java.util.Arrays.toString(root.getChildren()));
            try { new CompanionRenameProcessor().prepareRenaming(psi, "Collision.md", new LinkedHashMap<>()); throw new AssertionError("Rename collision accepted"); }
            catch (com.intellij.util.IncorrectOperationException expected) { }
        });
        com.intellij.openapi.project.DumbService.getInstance(project).waitForSmartMode();
        var moved = new java.util.concurrent.CountDownLatch(1);
        ApplicationManager.getApplication().invokeAndWait(() -> {
            var manager = com.intellij.psi.PsiManager.getInstance(project);
            var psi = manager.findFile(root.findChild("Draft.md"));
            var target = manager.findDirectory(root.findChild("target"));
            var handler = new CompanionMoveHandler();
            if (!handler.canMove(new com.intellij.psi.PsiElement[]{psi}, target, null)) throw new AssertionError("Move handler not applicable");
            var assets = manager.findDirectory(root.findChild("Draft.assets"));
            if (CompanionAssets.expand(new com.intellij.psi.PsiElement[]{psi, assets}).length != 2) throw new AssertionError("Companion was duplicated");
            javax.swing.Timer submit = new javax.swing.Timer(200, event -> {
                for (java.awt.Window window : java.awt.Window.getWindows()) {
                    if (window instanceof javax.swing.JDialog dialog && dialog.isShowing() && Messages.text("Move note and attachments").equals(dialog.getTitle())) {
                        if (clickButton(dialog, Messages.text("Move"))) ((javax.swing.Timer)event.getSource()).stop();
                    }
                }
            });
            submit.start();
            try { handler.doMove(project, new com.intellij.psi.PsiElement[]{psi}, target, moved::countDown); }
            finally { submit.stop(); }
        });
        if (!moved.await(45, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Native move timed out");
        ApplicationManager.getApplication().invokeAndWait(() -> FileDocumentManager.getInstance().saveAllDocuments());
        if (!Files.exists(base.resolve("target/Draft.md")) || !Files.exists(base.resolve("target/Draft.assets/image.svg"))) throw new AssertionError("Move did not pair attachments");
        if (!Files.readString(base.resolve("target/Draft.md")).contains("Draft.assets/image.svg")) throw new AssertionError("Moved attachment link is incorrect");
        if (!Files.readString(base.resolve("target/Draft.md")).contains("[Other](../Other.md#topic)")) throw new AssertionError("Outgoing move link not rebased");
        if (!Files.readString(base.resolve("Backlinks.md")).contains("[Plan](target/Draft.md#topic)")) throw new AssertionError("Incoming move link not rebased");
        if (!Files.exists(base.resolve("assets/shared.txt"))) throw new AssertionError("Shared assets moved");
        undoRefactoring(project, false);
        if (!Files.exists(base.resolve("Draft.md")) || !Files.exists(base.resolve("Draft.assets/image.svg"))) throw new AssertionError("Move undo did not restore pair");
        Files.createDirectories(base.resolve("target/Draft.assets")); root.refresh(false, true);
        ApplicationManager.getApplication().invokeAndWait(() -> {
            var manager = com.intellij.psi.PsiManager.getInstance(project);
            try { CompanionMoveHandler.processor(project, new com.intellij.psi.PsiElement[]{manager.findFile(root.findChild("Draft.md"))}, manager.findDirectory(root.findChild("target")), null, () -> {}); throw new AssertionError("Move collision accepted"); }
            catch (com.intellij.util.IncorrectOperationException expected) { }
        });
        com.intellij.openapi.project.DumbService.getInstance(project).waitForSmartMode();
        var plainRenamed = new java.util.concurrent.CountDownLatch(1);
        ApplicationManager.getApplication().invokeAndWait(() -> {
            var other = com.intellij.psi.PsiManager.getInstance(project).findFile(root.findChild("Other.md"));
            var document = FileDocumentManager.getInstance().getDocument(root.findChild("Backlinks.md"));
            com.intellij.openapi.command.WriteCommandAction.runWriteCommandAction(project, () -> document.insertString(document.getTextLength(), "\n[Unsaved](Other.md)\n"));
            com.intellij.psi.PsiDocumentManager.getInstance(project).commitAllDocuments();
            var processor = new com.intellij.refactoring.rename.RenameProcessor(project, other, "Other Renamed.md", false, false) {
                @Override public void performRefactoring(com.intellij.usageView.UsageInfo[] usages) { super.performRefactoring(usages); plainRenamed.countDown(); }
            };
            processor.setPreviewUsages(false); processor.run();
        });
        if (!plainRenamed.await(45, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Plain note rename timed out");
        ApplicationManager.getApplication().invokeAndWait(() -> FileDocumentManager.getInstance().saveAllDocuments());
        if (!Files.readString(base.resolve("Backlinks.md")).contains("[Unsaved](Other%20Renamed.md)")) throw new AssertionError("Unsaved incoming link or companion-free rename failed");
        if (!Files.readString(base.resolve("Draft.md")).contains("Other%20Renamed.md#topic")) throw new AssertionError("Companion-free rename failed");
        com.intellij.openapi.project.DumbService.getInstance(project).waitForSmartMode();
        var folderRenamed = new java.util.concurrent.CountDownLatch(1);
        ApplicationManager.getApplication().invokeAndWait(() -> {
            var folder = com.intellij.psi.PsiManager.getInstance(project).findDirectory(root.findChild("folder"));
            var processor = new com.intellij.refactoring.rename.RenameProcessor(project, folder, "renamed-folder", false, false) {
                @Override public void performRefactoring(com.intellij.usageView.UsageInfo[] usages) { super.performRefactoring(usages); folderRenamed.countDown(); }
            };
            processor.setPreviewUsages(false); processor.run();
        });
        if (!folderRenamed.await(45, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Folder rename timed out");
        ApplicationManager.getApplication().invokeAndWait(() -> FileDocumentManager.getInstance().saveAllDocuments());
        if (!Files.readString(base.resolve("FolderLink.md")).contains("renamed-folder/Inner.md")) throw new AssertionError("Folder incoming link not updated");
        System.out.println("MERKZEUG_SMOKE native paired rename/move, Markdown links, undo/redo, collisions and shared assets passed");
    }

    private static void undoRefactoring(Project project, boolean redo) {
        ApplicationManager.getApplication().invokeAndWait(() -> {
            javax.swing.Timer confirm = new javax.swing.Timer(150, event -> {
                for (java.awt.Window window : java.awt.Window.getWindows()) {
                    if (window instanceof javax.swing.JDialog dialog && dialog.isShowing()) {
                        JButton button = dialog.getRootPane().getDefaultButton();
                        if (button != null) button.doClick();
                    }
                }
            });
            confirm.start();
            try {
                var manager = com.intellij.openapi.command.undo.UndoManager.getInstance(project);
                if (redo) manager.redo(null); else manager.undo(null);
            } finally { confirm.stop(); }
            FileDocumentManager.getInstance().saveAllDocuments();
        });
    }

    private static boolean clickButton(java.awt.Container container, String label) {
        for (java.awt.Component component : container.getComponents()) {
            if (component instanceof javax.swing.JButton button && label.equals(button.getText())) { button.doClick(); return true; }
            if (component instanceof java.awt.Container child && clickButton(child, label)) return true;
        }
        return false;
    }

}
