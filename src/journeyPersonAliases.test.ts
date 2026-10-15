import {describe,expect,it} from 'vitest'
import {checkHumanPersonLink} from './journeyPersonAliases'

describe('Reversible identity reconciliation',()=>{
  it('never infers duplicate identities from names or grants contact consent',()=>{
    expect(()=>checkHumanPersonLink({
      duplicatePersonId:'person-1',canonicalPersonId:'person-2',
      reason:'Identidade conferida pessoalmente pela equipe autorizada',
    })).not.toThrow()
    expect(()=>checkHumanPersonLink({
      duplicatePersonId:'person-1',canonicalPersonId:'person-2',reason:'Nomes iguais',
    })).toThrow('alias_reason_required')
  })
  it('blocks an alias to the same person and invalid path identifiers',()=>{
    expect(()=>checkHumanPersonLink({duplicatePersonId:'a',canonicalPersonId:'a',reason:'conferencia presencial da identidade'})).toThrow()
    expect(()=>checkHumanPersonLink({duplicatePersonId:'a/b',canonicalPersonId:'c',reason:'conferencia presencial da identidade'})).toThrow()
  })
})
