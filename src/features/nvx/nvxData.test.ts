import { describe, expect, it } from 'vitest'
import {
  bodyWarnings,
  buildChangeBody,
  buildChangesBody,
  cleanRequest,
  formatHeaderLines,
  parseDeviceBody,
  parseHeaderLines,
  defaultGroups,
  describeStatus,
  getAtPath,
  isEditable,
  parseChangeStatuses,
  propertyUrl,
  setAtPath,
  showSetting,
  changeLine,
  summarizeStatuses,
  formatChangeLog,
  flatten,
  formatReport,
  formatResult,
  compareRows,
  sortResults,
  splitPath,
  newGroup,
  normalizeIp,
  normalizePath,
  prettyAnswer,
  reviveGroups,
  describeForm,
  formatBytes,
  formSize,
  formToRows,
  missingFiles,
  newFormRow,
  rowsToForm,
  withoutFileData,
} from './nvxData'
import type { ChangeLogEntry, ChangeStatus, RunResult } from './types'

const unit = { id: 'u', label: 'Lab encoder', ip: '10.0.0.5' }
const ok = (data: unknown): RunResult => ({
  key: 'k',
  title: 'Device info',
  method: 'GET',
  path: '/Device/DeviceInfo',
  callIndex: 0,
  unit,
  reply: { ok: true, status: 200, ms: 20, data, text: JSON.stringify(data) },
})

describe('normalizeIp', () => {
  it('accepts a dotted address and tidies leading zeros', () => {
    expect(normalizeIp(' 10.0.0.5 ')).toBe('10.0.0.5')
    expect(normalizeIp('010.000.0.05')).toBe('10.0.0.5')
  })

  it('refuses anything else', () => {
    for (const text of ['', '10.0.0', '10.0.0.256', '10.0.0.5.1', 'nvx.local', '10.0.0.x', '1000.0.0.1']) {
      expect(normalizeIp(text)).toBeNull()
    }
  })
})

describe('normalizePath', () => {
  it('adds the missing slash and keeps a query', () => {
    expect(normalizePath('Device/DeviceInfo')).toBe('/Device/DeviceInfo')
    expect(normalizePath(' /Device/Ethernet?x=1 ')).toBe('/Device/Ethernet?x=1')
  })

  it('cuts a pasted address down to its path', () => {
    expect(normalizePath('https://172.30.144.138/Device/Ethernet/HostName')).toBe('/Device/Ethernet/HostName')
    expect(normalizePath('https://172.30.144.138')).toBe('/')
  })

  it('refuses what the app would not send', () => {
    for (const text of ['', '   ', '//evil.com/x', '/a b', '/ä', `/${'a'.repeat(600)}`, 'https://']) {
      expect(normalizePath(text)).toBeNull()
    }
  })
})

describe('flatten', () => {
  it('puts each value on its own dotted line', () => {
    expect(flatten({ Device: { Ethernet: { HostName: 'NVX-LAB', Dhcp: true, Vlan: 20, Dns: null } } })).toEqual([
      { path: 'Device.Ethernet.HostName', value: 'NVX-LAB' },
      { path: 'Device.Ethernet.Dhcp', value: 'true' },
      { path: 'Device.Ethernet.Vlan', value: '20' },
      { path: 'Device.Ethernet.Dns', value: 'null' },
    ])
  })

  it('numbers list items and shows empty containers', () => {
    expect(flatten({ A: { List: ['x', { B: 1 }], Empty: {}, None: [] } })).toEqual([
      { path: 'A.List[0]', value: 'x' },
      { path: 'A.List[1].B', value: '1' },
      { path: 'A.Empty', value: '{}' },
      { path: 'A.None', value: '[]' },
    ])
  })

  it('handles an answer that is just a value', () => {
    expect(flatten('hello')).toEqual([{ path: '', value: 'hello' }])
  })
})

describe('reports', () => {
  it('writes a result as a heading and one line per value', () => {
    expect(formatResult(ok({ Device: { DeviceInfo: { Model: 'DM-NVX-E30' } } }))).toBe(
      '== Device info · Lab encoder (10.0.0.5) · /Device/DeviceInfo ==\nDevice.DeviceInfo.Model: DM-NVX-E30',
    )
  })

  it('shows the error of a call that failed', () => {
    const failed: RunResult = { ...ok({}), reply: { ok: false, status: 403, ms: 5, kind: 'auth', error: 'Login refused: wrong username or password.' } }
    expect(formatResult(failed)).toContain('ERROR: Login refused: wrong username or password.')
  })

  it('shows the raw text when the answer was not JSON, and falls back to the IP without a label', () => {
    const plain: RunResult = { ...ok({}), unit: { ...unit, label: '' }, reply: { ok: true, status: 200, ms: 5, text: ' hello ' } }
    expect(formatResult(plain)).toBe('== Device info · 10.0.0.5 (10.0.0.5) · /Device/DeviceInfo ==\nhello')
  })

  it('joins several results with a blank line', () => {
    expect(formatReport([ok({ a: 1 }), ok({ b: 2 })]).split('\n\n')).toHaveLength(2)
  })

  it('prettyAnswer indents JSON and passes other text through', () => {
    expect(prettyAnswer({ ok: true, status: 200, ms: 1, data: { a: 1 } })).toBe('{\n  "a": 1\n}')
    expect(prettyAnswer({ ok: true, status: 200, ms: 1, text: ' hi\n' })).toBe('hi')
  })
})

describe('reviveGroups', () => {
  it('starts a new group with the manual’s example calls', () => {
    const [group] = defaultGroups()
    expect(group.name).toBe('NVX API')
    expect(group.username).toBe('admin')
    expect(group.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['GET /Device/DeviceInfo', 'GET /Device/Ethernet/HostName'])
    expect(group.folders).toEqual([])
    expect(newGroup('   ').name).toBe('New group')
  })

  it('round-trips what the app writes', () => {
    const groups = defaultGroups()
    groups[0].units.push({ id: 'u1', label: 'Lab', ip: '10.0.0.5' })
    expect(reviveGroups(JSON.parse(JSON.stringify(groups)))).toEqual(groups)
  })

  it('drops units and calls that cannot be used and keeps the rest', () => {
    const [group] = reviveGroups([
      {
        id: 'g',
        name: 'NAX',
        username: ' admin ',
        units: [{ id: 'a', label: 'ok', ip: '10.0.0.9' }, { ip: 'nope' }, null, { ip: '10.0.0.300' }],
        calls: [{ id: 'c', title: 'Info', path: 'Device/DeviceInfo' }, { title: 'bad', path: '//x' }, 'text'],
      },
    ])!
    expect(group.username).toBe('admin')
    expect(group.units).toEqual([{ id: 'a', label: 'ok', ip: '10.0.0.9' }])
    expect(group.calls).toEqual([{ id: 'c', title: 'Info', method: 'GET', path: '/Device/DeviceInfo' }])
  })

  it('gives a call without a title its path, and fills in missing ids', () => {
    const [group] = reviveGroups([{ name: 'X', calls: [{ path: '/Device/DeviceInfo' }] }])!
    expect(group.calls[0].title).toBe('/Device/DeviceInfo')
    expect(group.id).toBeTruthy()
    expect(group.calls[0].id).toBeTruthy()
  })

  it('keeps one group per id', () => {
    expect(reviveGroups([{ id: 'same', name: 'A' }, { id: 'same', name: 'B' }])!.map((g) => g.name)).toEqual(['A'])
  })

  it('returns null for something that is not a list, and an empty list for an empty one', () => {
    expect(reviveGroups({ groups: [] })).toBeNull()
    expect(reviveGroups('x')).toBeNull()
    expect(reviveGroups([])).toEqual([])
  })
})

const unitA = { id: 'a', label: 'A', ip: '10.0.0.1' }
const unitB = { id: 'b', label: 'B', ip: '10.0.0.2' }
const answer = (u: typeof unitA, callIndex: number, data: unknown): RunResult => ({
  key: `${u.id}${callIndex}`,
  title: `call ${callIndex}`,
  method: 'GET',
  path: '/x',
  callIndex,
  unit: u,
  reply: { ok: true, status: 200, ms: 1, data },
})
const failure = (u: typeof unitA): RunResult => ({
  key: `${u.id}!`,
  title: 'call 0',
  method: 'GET',
  path: '/x',
  callIndex: 0,
  unit: u,
  reply: { ok: false, status: null, ms: 1, kind: 'network', error: 'No answer' },
})

describe('splitPath', () => {
  it('dims the object and keeps the property bright, without the leading Device.', () => {
    expect(splitPath('Device.DeviceInfo.Model')).toEqual({ prefix: 'DeviceInfo.', leaf: 'Model' })
    expect(splitPath('Device.Ethernet.Adapters[0].Ip')).toEqual({ prefix: 'Ethernet.Adapters[0].', leaf: 'Ip' })
    expect(splitPath('Device.Name')).toEqual({ prefix: '', leaf: 'Name' })
    expect(splitPath('Model')).toEqual({ prefix: '', leaf: 'Model' })
  })
})

describe('sortResults', () => {
  it('puts answers that arrived out of order back unit by unit, call by call', () => {
    const arrived = [answer(unitB, 1, {}), answer(unitA, 1, {}), answer(unitB, 0, {}), answer(unitA, 0, {})]
    expect(sortResults(arrived, [unitA, unitB]).map((r) => r.key)).toEqual(['a0', 'a1', 'b0', 'b1'])
  })
})

describe('compareRows', () => {
  it('lines the units up and flags the properties that differ', () => {
    const rows = compareRows(
      [
        answer(unitA, 0, { Device: { Info: { Model: 'E30', Version: '7.4' } } }),
        answer(unitB, 0, { Device: { Info: { Model: 'E30', Version: '7.2' } } }),
      ],
      [unitA, unitB],
    )
    expect(rows).toEqual([
      { path: 'Device.Info.Model', values: ['E30', 'E30'], differs: false },
      { path: 'Device.Info.Version', values: ['7.4', '7.2'], differs: true },
    ])
  })

  it('flags a property that only one of the answering units has', () => {
    const rows = compareRows([answer(unitA, 0, { Device: { Extra: 1, Same: 5 } }), answer(unitB, 0, { Device: { Same: 5 } })], [unitA, unitB])
    expect(rows).toEqual([
      { path: 'Device.Extra', values: ['1', null], differs: true },
      { path: 'Device.Same', values: ['5', '5'], differs: false },
    ])
  })

  it('leaves a unit that never answered out of the comparison', () => {
    const rows = compareRows([answer(unitA, 0, { Device: { Same: 1 } }), failure(unitB)], [unitA, unitB])
    expect(rows).toEqual([{ path: 'Device.Same', values: ['1', null], differs: false }])
  })

  it('keeps the first value when two calls answer the same property', () => {
    const rows = compareRows([answer(unitA, 0, { Device: { H: 'one' } }), answer(unitA, 1, { Device: { H: 'two' } })], [unitA])
    expect(rows).toEqual([{ path: 'Device.H', values: ['one'], differs: false }])
  })

  it('is empty when nothing answered', () => {
    expect(compareRows([failure(unitA)], [unitA])).toEqual([])
  })
})

describe('building a change', () => {
  it('nests the property under its path', () => {
    expect(buildChangeBody('Device.Ethernet.HostName', 'NVX-1')).toEqual({ Device: { Ethernet: { HostName: 'NVX-1' } } })
    expect(buildChangeBody('Device.Vlan', 20)).toEqual({ Device: { Vlan: 20 } })
    expect(buildChangeBody('Device.A.B.C', false)).toEqual({ Device: { A: { B: { C: false } } } })
  })

  it('refuses paths that are not a plain Device property', () => {
    expect(buildChangeBody('Other.A', 1)).toBeNull()
    expect(buildChangeBody('Device.List[0].Ip', '10.0.0.1')).toBeNull()
  })

  it('turns a property path into the address to read it back from', () => {
    expect(propertyUrl('Device.Ethernet.HostName')).toBe('/Device/Ethernet/HostName')
    expect(propertyUrl('Device.List[0].Ip')).toBeNull()
  })

  it('says which values can be edited in place', () => {
    expect(isEditable('Device.A.B', 'x')).toBe(true)
    expect(isEditable('Device.A.B', 5)).toBe(true)
    expect(isEditable('Device.A.B', false)).toBe(true)
    expect(isEditable('Device.A.B', null)).toBe(false)
    expect(isEditable('Device.A[0]', 'x')).toBe(false)
    expect(isEditable('Elsewhere.A', 'x')).toBe(false)
  })

  it('reads and replaces a value at a path without touching the original', () => {
    const data = { Device: { Ethernet: { HostName: 'old', Dhcp: true } } }
    expect(getAtPath(data, 'Device.Ethernet.HostName')).toBe('old')
    expect(getAtPath(data, 'Device.Nope.HostName')).toBeUndefined()
    const next = setAtPath(data, 'Device.Ethernet.HostName', 'new')
    expect(next).toEqual({ Device: { Ethernet: { HostName: 'new', Dhcp: true } } })
    expect(data.Device.Ethernet.HostName).toBe('old')
    expect(setAtPath(data, 'Device.Missing', 'x')).toBe(data)
  })
})

describe('the device’s answer to a change', () => {
  const answer = (...results: object[]) => ({ Actions: [{ Operation: 'SetPartial', Results: results, TargetObject: 'Ethernet', Version: '2.1.0' }] })

  it('reads the status of each property', () => {
    expect(parseChangeStatuses(answer({ Path: 'Device.Ethernet', Property: 'HostName', StatusId: 1, StatusInfo: 'Reboot needed' }))).toEqual([
      { path: 'Device.Ethernet', property: 'HostName', statusId: 1, statusInfo: 'Reboot needed' },
    ])
  })

  it('gives nothing for an answer that is not a result list', () => {
    for (const data of [undefined, null, 'x', {}, { Actions: 'x' }, { Actions: [null, { Results: 'x' }, { Results: [{ Property: 'P' }] }] }]) {
      expect(parseChangeStatuses(data)).toEqual([])
    }
  })

  it('says what each code means', () => {
    expect(describeStatus(0)).toBe('OK')
    expect(describeStatus(1)).toContain('restart')
    expect(describeStatus(-2)).toContain('read only')
    expect(describeStatus(-1)).toContain('range')
    expect(describeStatus(-9)).toContain('-9')
  })

  it('judges the whole change: applied, restart needed, or not applied', () => {
    const status = (statusId: number, property = 'P', statusInfo = ''): ChangeStatus => ({ path: 'Device.X', property, statusId, statusInfo })
    expect(summarizeStatuses([status(0)]).outcome).toBe('applied')
    expect(summarizeStatuses([]).outcome).toBe('applied')
    expect(summarizeStatuses([status(0), status(1, 'HostName', 'Reboot needed')])).toEqual({
      outcome: 'restart',
      detail: 'HostName: A device restart is required for this to take effect (Reboot needed)',
    })
    expect(summarizeStatuses([status(1), status(-2, 'MacAddress')]).outcome).toBe('failed')
    expect(summarizeStatuses([status(3, 'Thing')]).outcome).toBe('failed')
  })

  it('writes the log as plain text for a case note, oldest first', () => {
    const entry = (at: number, label: string): ChangeLogEntry => ({
      id: String(at),
      at,
      unit: { id: 'u', label, ip: '10.0.0.5' },
      lines: ['Device.Ethernet.HostName: "A" → "B"'],
      outcome: 'restart',
      detail: 'HostName: A device restart is required for this to take effect',
    })
    const text = formatChangeLog([entry(new Date(2026, 9, 20, 15, 30).getTime(), 'Second'), entry(new Date(2026, 9, 20, 14, 5).getTime(), '')])
    expect(text.split('\n\n')).toHaveLength(2)
    expect(text.startsWith('2026-10-20 14:05 · 10.0.0.5 (10.0.0.5) · Applied, restart needed\n  Device.Ethernet.HostName: "A" → "B"\n  HostName:')).toBe(true)
    expect(text).toContain('2026-10-20 15:30 · Second (10.0.0.5)')
    expect(showSetting('x')).toBe('"x"')
    expect(showSetting(5)).toBe('5')
    expect(showSetting({})).toBe('{}')
    expect(showSetting({ A: 1 })).toBe('{"A":1}')
    expect(changeLine('Device.A.B', 'new', 'old')).toBe('Device.A.B: "old" → "new"')
    expect(changeLine('Device.A.B', 5)).toBe('Device.A.B: 5')
    expect(changeLine('Device.A.B', 'new', 'old', 'new')).toBe('Device.A.B: "old" → "new" · the device now reports "new"')
  })
})

describe('saved requests and folders', () => {
  it('keeps method, headers, body and folder, and reads an old call as a GET', () => {
    const [group] = reviveGroups([
      {
        id: 'g',
        name: 'NVX',
        folders: [{ id: 'f1', name: 'Network' }, null],
        calls: [
          { id: 'a', title: 'Set host', method: 'post', path: '/Device', headers: { 'X-One': '1', 'Bad Name': 'x', Num: 5 }, body: '{"Device":{}}', folderId: 'f1' },
          { id: 'b', title: 'Old', path: '/Device/DeviceInfo' },
          { id: 'c', title: 'Lost', method: 'GET', path: '/x', folderId: 'gone', body: 'ignored for GET' },
          { id: 'd', title: 'Odd method', method: 'TRACE', path: '/y' },
        ],
      },
    ])!
    expect(group.folders).toEqual([{ id: 'f1', name: 'Network' }])
    expect(group.calls[0]).toEqual({ id: 'a', title: 'Set host', method: 'POST', path: '/Device', headers: { 'X-One': '1' }, body: '{"Device":{}}', folderId: 'f1' })
    expect(group.calls[1]).toEqual({ id: 'b', title: 'Old', method: 'GET', path: '/Device/DeviceInfo' })
    expect(group.calls[2]).toEqual({ id: 'c', title: 'Lost', method: 'GET', path: '/x' })
    expect(group.calls[3].method).toBe('GET')
  })

  it('round-trips folders and requests', () => {
    const groups = defaultGroups()
    groups[0].folders.push({ id: 'f', name: 'Setup' })
    groups[0].calls.push({ id: 'p', title: 'Post', method: 'POST', path: '/Device', body: '{"Device":{"A":1}}', headers: { A: 'b' }, folderId: 'f' })
    expect(reviveGroups(JSON.parse(JSON.stringify(groups)))).toEqual(groups)
  })
})

describe('headers and bodies', () => {
  it('reads headers typed one per line', () => {
    expect(parseHeaderLines('Accept: text/plain\n\n  X-Token :  a:b  \n')).toEqual({ headers: { Accept: 'text/plain', 'X-Token': 'a:b' }, error: null })
    expect(parseHeaderLines('')).toEqual({ headers: {}, error: null })
  })

  it('reports a line that is not a header and keeps the good ones', () => {
    expect(parseHeaderLines('Good: 1\nnonsense\nBad Name: x')).toEqual({ headers: { Good: '1' }, error: 'Line 2: write a header as Name: value.' })
  })

  it('writes headers back as lines', () => {
    expect(formatHeaderLines({ A: '1', B: '2' })).toBe('A: 1\nB: 2')
    expect(formatHeaderLines(undefined)).toBe('')
  })

  it('names every empty object in a body, because the device deletes those', () => {
    expect(bodyWarnings('{"Device":{"DeviceSpecific":{}}}')).toEqual(['Device.DeviceSpecific is an empty object. The device deletes an object it is sent empty.'])
    expect(bodyWarnings('{"Device":{"A":{},"B":{"C":{}}}}')).toHaveLength(2)
    expect(bodyWarnings('{"Device":{"List":[{}]}}')).toEqual(['Device.List[0] is an empty object. The device deletes an object it is sent empty.'])
  })

  it('has no warning for a normal body, text that is not JSON, or nothing', () => {
    expect(bodyWarnings('{"Device":{"Ethernet":{"HostName":"x"}}}')).toEqual([])
    expect(bodyWarnings('a=1&b=2')).toEqual([])
    expect(bodyWarnings('{oops')).toEqual([])
    expect(bodyWarnings(undefined)).toEqual([])
    expect(bodyWarnings('{}')).toEqual([]) // the whole body being empty is not an object being deleted
  })

  it('drops empty headers, and the body of a GET', () => {
    expect(cleanRequest({ method: 'GET', path: '/x', headers: {}, body: '{"a":1}' })).toEqual({ method: 'GET', path: '/x' })
    expect(cleanRequest({ method: 'POST', path: '/Device', headers: { A: 'b' }, body: '  ' })).toEqual({ method: 'POST', path: '/Device', headers: { A: 'b' } })
    expect(cleanRequest({ method: 'POST', path: '/Device', body: '{"a":1}' })).toEqual({ method: 'POST', path: '/Device', body: '{"a":1}' })
  })

  it('recognises the manual’s way of changing a setting, and nothing else', () => {
    const post = { method: 'POST' as const, path: '/Device', body: '{"Device":{"A":1}}' }
    expect(parseDeviceBody(post)).toEqual({ Device: { A: 1 } })
    expect(parseDeviceBody({ ...post, method: 'PUT' })).toBeNull()
    expect(parseDeviceBody({ ...post, path: '/Device/A' })).toBeNull()
    expect(parseDeviceBody({ ...post, body: 'x=1' })).toBeNull()
    expect(parseDeviceBody({ ...post, body: '[1]' })).toBeNull()
    expect(parseDeviceBody({ ...post, body: '{"Other":1}' })).toBeNull()
    expect(parseDeviceBody({ method: 'POST', path: '/Device' })).toBeNull()
  })

  it('mentions the method in a report only when it is not a GET, and a picture by its type and size', () => {
    const posted: RunResult = { ...ok({ Actions: [] }), method: 'POST', path: '/Device' }
    expect(formatResult(posted).startsWith('== Device info · Lab encoder (10.0.0.5) · POST /Device ==')).toBe(true)
    const picture: RunResult = { ...ok({}), reply: { ok: true, status: 200, ms: 5, bytes: 1234, image: { type: 'image/jpeg', base64: 'AAAA' } } }
    expect(formatResult(picture).endsWith('(image/jpeg, 1234 bytes)')).toBe(true)
  })
})

describe('form-data', () => {
  const file = { key: 'UploadedFile', type: 'file' as const, fileName: 'Testing.lpz', data: new Uint8Array([1, 2, 3]) }
  const text = { key: 'UploadedFilePath', type: 'text' as const, value: '/data/web/tmp/programload/slot1' }

  it('sends a form instead of a raw body, and never on a GET', () => {
    expect(cleanRequest({ method: 'POST', path: '/Device', body: '{"a":1}', form: [text] })).toEqual({ method: 'POST', path: '/Device', form: [text] })
    expect(cleanRequest({ method: 'POST', path: '/Device', body: '{"a":1}', form: [] })).toEqual({ method: 'POST', path: '/Device', body: '{"a":1}' })
    expect(cleanRequest({ method: 'GET', path: '/Device', form: [text] })).toEqual({ method: 'GET', path: '/Device' })
  })

  it('turns ticked, named rows into parts and back', () => {
    const rows = [
      newFormRow({ key: ' UploadedFilePath ', value: text.value }),
      newFormRow({ key: 'Skipped', value: 'x', enabled: false }),
      newFormRow({ key: '', value: 'no name' }),
      newFormRow({ key: 'UploadedFile', type: 'file', fileName: 'Testing.lpz', data: file.data }),
    ]
    expect(rowsToForm(rows)).toEqual([text, file])
    expect(formToRows([text, file]).map(({ key, type, value, fileName }) => ({ key, type, value, fileName }))).toEqual([
      { key: 'UploadedFilePath', type: 'text', value: text.value, fileName: '' },
      { key: 'UploadedFile', type: 'file', value: '', fileName: 'Testing.lpz' },
    ])
  })

  it('names the files that still have to be chosen, and measures the upload', () => {
    expect(missingFiles([text, { key: 'UploadedFile', type: 'file', fileName: 'Testing.lpz' }])).toEqual(['Testing.lpz'])
    expect(missingFiles([text, file])).toEqual([])
    expect(formSize([text, file])).toBe(text.value.length + 3)
    expect(formatBytes(3)).toBe('3 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('saves a file by name only, and reads it back as a file that must be chosen again', () => {
    expect(withoutFileData([text, file])).toEqual([text, { key: 'UploadedFile', type: 'file', fileName: 'Testing.lpz' }])
    const [group] = reviveGroups([
      { id: 'g', name: 'G', units: [], calls: [{ id: 'c', title: 'Load', method: 'POST', path: '/Device', body: 'ignored', form: [text, { ...file, data: [1, 2, 3] }, { key: '', type: 'text', value: 'x' }] }] },
    ])!
    expect(group.calls[0].form).toEqual([text, { key: 'UploadedFile', type: 'file', fileName: 'Testing.lpz' }])
    expect(group.calls[0].body).toBeUndefined()
  })

  it('describes each part on a line', () => {
    expect(describeForm([text, file])).toEqual([`UploadedFilePath = ${text.value}`, 'UploadedFile = file Testing.lpz (3 B)'])
  })
})

describe('several changes at once', () => {
  it('merges the properties of one unit into a single partial object', () => {
    expect(buildChangesBody({ 'Device.DeviceInfo.Category': 'test', 'Device.DeviceInfo.BuildDate': 'x', 'Device.Ethernet.HostName': 'NVX-1' })).toEqual({
      Device: { DeviceInfo: { Category: 'test', BuildDate: 'x' }, Ethernet: { HostName: 'NVX-1' } },
    })
  })

  it('sends nothing when there are no edits or one path cannot be sent', () => {
    expect(buildChangesBody({})).toBeNull()
    expect(buildChangesBody({ 'Device.A': 1, 'Other.B': 2 })).toBeNull()
    expect(buildChangesBody({ 'Device.A': false })).toEqual({ Device: { A: false } })
  })
})
