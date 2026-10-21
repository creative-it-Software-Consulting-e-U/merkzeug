/** Helpers of the assistant panel: block splitting from core plus inline rendering. */
export { splitAnswer, fencedBlock, type AnswerBlock } from '@merkzeug/core/assistant'

/** Minimal inline rendering for prose parts: bold, inline code, line breaks. */
export function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let key = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) nodes.push(text.slice(last, index))
    const token = match[0]
    if (token.startsWith('**')) nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
    else nodes.push(<code key={key++}>{token.slice(1, -1)}</code>)
    last = index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}
