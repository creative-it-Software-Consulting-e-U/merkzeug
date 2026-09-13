/** Convert content rules only; never inject template CSS into the application shell. */
export function liveTemplateCss(css: string): string {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  const render = (rules: CSSRuleList): string => Array.from(rules).map(rule => {
    if (rule instanceof CSSStyleRule) {
      const selectors = rule.selectorText.split(/,(?![^()]*\))/).flatMap(selector => {
        // Page furniture, global selectors and unrelated template classes are excluded.
        if (!selector.includes('.pdf-content')) return []
        return [selector.trim().replaceAll('.pdf-content', ':scope')]
      })
      if (!selectors.length) return ''
      const declarations = Array.from(rule.style).filter(property => !/^(position|z-index|display|visibility|content|page|break-|pointer-events)/.test(property))
        .map(property => `${property}:${rule.style.getPropertyValue(property)};`).join('')
      return `${selectors.join(',')}{${declarations}}`
    }
    if (rule instanceof CSSMediaRule && !/print/.test(rule.conditionText)) return `@media ${rule.conditionText}{${render(rule.cssRules)}}`
    return ''
  }).join('\n')
  return `@scope (.template-live .editor-root) { ${render(sheet.cssRules)} }`
}
