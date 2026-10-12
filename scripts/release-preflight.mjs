#!/usr/bin/env node
// Read-only preflight. It deliberately never checks out, resets, merges, pushes or deploys.
import {execFileSync} from 'node:child_process'
const git=(args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
const base=process.env.NJ_RELEASE_BASE||'origin/production'
const target=process.env.NJ_RELEASE_TARGET||'origin/main'
const warnings=[]
const failures=[]
let head=''
try {head=git(['rev-parse','HEAD'])} catch { failures.push('Not a Git worktree.') }
try {if(git(['status','--porcelain']))failures.push('Uncommitted changes exist.') }
catch {failures.push('Unable to inspect worktree.') }
try {
  git(['rev-parse','--verify',base]); git(['rev-parse','--verify',target])
  const [onlyProd,onlyMain]=git(['rev-list','--left-right','--count',base+'...'+target]).split(/\s+/).map(Number)
  console.log('Branches:',base,'vs',target)
  console.log('Unique commits on production:',onlyProd,' / main:',onlyMain)
  if(onlyProd>0)failures.push('Production contains unique commits. A reviewed non-destructive reconciliation is required.')
  if(onlyMain===0)warnings.push('No newer main commits relative to production.')
}catch{
  failures.push('Required remote refs missing. Run: git fetch --no-tags origin main production')
}
const required=[
  ['NJ_BACKUP_REFERENCE','Versioned Firestore export/restore verification'],
  ['NJ_RULES_REVIEW_REFERENCE','Independent Rules review'],
  ['NJ_QA_REFERENCE','Authenticated mobile/desktop PT/EN/ES QA'],
  ['NJ_HUB_REGRESSION_REFERENCE','Hub, entitlements, invitations and MusicScale regression check'],
  ['NJ_ROLLBACK_REFERENCE','Written rollback and data recovery drill'],
]
for(const [key,label] of required){
  const proof=process.env[key]?.trim()
  if(!proof || proof.length<6) failures.push(label+' missing ('+key+').')
  else console.log(label+': verified reference supplied')
}
console.log('Inspected HEAD:',head)
for(const line of warnings)console.warn('WARNING:',line)
for(const line of failures)console.error('BLOCKED:',line)
if(failures.length)process.exitCode=1
else console.log('Read-only prerequisites met. This script does NOT approve or perform deployment.')
