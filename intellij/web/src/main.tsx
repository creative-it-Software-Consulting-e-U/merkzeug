import { mountIde } from '@merkzeug/ide'

// JCEF serves project images through the editor's private resource origin.
mountIde({ host: 'IntelliJ', edition: 'intellij' })
