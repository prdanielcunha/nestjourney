import {describe,expect,it} from 'vitest'
import {previewMemberImport,prepareApprovedMemberImport,normalizePersonName} from './memberBulkImport'
describe('member import requires explicit human review',()=>{
  it('reads PT/EN/ES header and safe two-column CSV without inferring contact consent',()=>{
    const rows=previewMemberImport('Nome;Nome preferido\n"Maria da Silva";"Maria"\nJoão Pereira;João',[])
    expect(rows.map(r=>r.status)).toEqual(['ready','ready'])
    expect(prepareApprovedMemberImport(rows,[2])).toEqual([{name:'João Pereira',preferredName:'João'}])
  })
  it('retains exact row numbers for paste without header and flags one-word names',()=>{
    const rows=previewMemberImport('Ana Maria\n\nLuis',[])
    expect(rows.map(r=>[r.rowNumber,r.status])).toEqual([[1,'ready'],[3,'review']])
    expect(rows[1].warning).toBe('short_name_review')
  })
  it('flags duplicate names for review and prohibits their direct import',()=>{
    const rows=previewMemberImport('José Carlos\nJose Carlos\nMarina Santos',[{name:'José Carlos'}])
    expect(rows.map(r=>r.status)).toEqual(['duplicate','duplicate','ready'])
    expect(()=>prepareApprovedMemberImport(rows,[1])).toThrow('member_import_approval_invalid')
  })
  it('rejects extra columns instead of silently importing emails, birthdays or contact permissions',()=>{
    const rows=previewMemberImport('Nome;Nome preferido\nAna Maria;Ana;999999999',[])
    expect(rows[0].status).toBe('invalid')
    expect(()=>prepareApprovedMemberImport(rows,[2])).toThrow()
  })
  it('handles quoted delimiters but does not merge unrelated people by guess',()=>{
    const rows=previewMemberImport('Nome;Nome preferido\n"Ana; Maria";Ana',[])
    expect(rows[0].name).toBe('Ana; Maria')
    expect(normalizePersonName(rows[0].name)).toBe('ana maria')
  })
  it('limits memory and batch size',()=>{
    expect(()=>previewMemberImport('x'.repeat(50_001),[])).toThrow()
    expect(()=>previewMemberImport(Array.from({length:76},(_,i)=>'Person '+i).join('\n'),[])).toThrow()
  })
})
