package com.creativeit.merkzeug;

import com.intellij.ide.actions.PrintActionHandler;
import com.intellij.openapi.actionSystem.PlatformDataKeys;
import com.intellij.openapi.actionSystem.DataContext;

/** Handle File → Print only for the active Merkzeug editor. */
public final class MerkzeugPrintHandler extends PrintActionHandler {
    @Override public boolean canPrint(DataContext context) {
        return PlatformDataKeys.FILE_EDITOR.getData(context) instanceof MerkzeugEditor;
    }
    @Override public void print(DataContext context) {
        if (PlatformDataKeys.FILE_EDITOR.getData(context) instanceof MerkzeugEditor editor) editor.requestPrint();
    }
}
