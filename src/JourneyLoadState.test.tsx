import {renderToStaticMarkup} from 'react-dom/server'
import {describe,expect,it} from 'vitest'
import {JourneyLoadState} from './JourneyLoadState'

describe('Recoverable journey data loading',()=>{
  it('shows the loading state without implying an empty congregation',()=>{
    const html=renderToStaticMarkup(<JourneyLoadState locale="pt-BR" title="Aniversários" phase="loading" onRetry={()=>{}}/>)
    expect(html).toContain('Buscando as informações')
    expect(html).not.toContain('Nenhum cadastro')
    expect(html).not.toContain('Tentar novamente')
  })
  it('offers retry and a safe exit when the read fails',()=>{
    const html=renderToStaticMarkup(<JourneyLoadState locale="pt-BR" title="Mesa Aberta" phase="error" onRetry={()=>{}}/>)
    expect(html).toContain('Não foi possível abrir')
    expect(html).toContain('Tentar novamente')
    expect(html).toContain('/my-today')
  })
  it.each(['en','es'] as const)('supports %s without exposing personal data',locale=>{
    const html=renderToStaticMarkup(<JourneyLoadState locale={locale} title="Journey" phase="loading" slow onRetry={()=>{}}/>)
    expect(html).toContain('button')
    expect(html).not.toContain('organizationId')
  })
})
