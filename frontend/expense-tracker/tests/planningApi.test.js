import test from 'node:test'
import assert from 'node:assert/strict'
import { planningRequest, localMonth } from '../src/utils/planningApi.js'

test('scenario requests carry the authenticated selection and preserve decimal values', async () => {
  const previous = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith('/api/analytics/scenarios'))
      assert.equal(options.headers.Authorization, 'Bearer local-test')
      assert.deepEqual(JSON.parse(options.body), {month:'2026-10',category:'Food',reductionPercent:20})
      return new Response(JSON.stringify({potentialReduction:429.15}),{status:200})
    }
    assert.equal((await planningRequest('/scenarios',{token:'local-test',method:'POST',body:{month:'2026-10',category:'Food',reductionPercent:20}})).potentialReduction,429.15)
  } finally { globalThis.fetch = previous }
})

test('an undeployed HTML route produces an actionable backend deployment message', async () => {
  const previous = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response('<html>Not found</html>',{status:404})
    await assert.rejects(planningRequest(),/Deploy the updated backend/)
  } finally { globalThis.fetch = previous }
})

test('feedback acknowledgments do not try to parse an empty 204 body', async () => {
  const previous = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response(null,{status:204})
    assert.equal(await planningRequest('/insights/id/feedback',{method:'POST',body:{response:'helpful'}}),null)
  } finally { globalThis.fetch = previous }
})

test('hung requests stop and report a timeout, while navigation cancellation stays distinguishable', async () => {
  const previous = globalThis.fetch
  try {
    globalThis.fetch = (_,options) => new Promise((resolve,reject) => {
      if(options.signal.aborted) reject(new DOMException('Aborted','AbortError'))
      else options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})
    })
    await assert.rejects(planningRequest('',{timeoutMs:5}),/took too long/)
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(planningRequest('',{signal:controller.signal}),{name:'AbortError'})
  } finally { globalThis.fetch = previous }
})

test('the period selector uses a full local year-month through year rollover', () => {
  assert.equal(localMonth(new Date(2026,0,1)), '2026-01')
  assert.equal(localMonth(new Date(2025,11,31)), '2025-12')
})
