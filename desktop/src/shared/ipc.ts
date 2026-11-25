export const IPC = {
  setOutput: 'output:set',
  outputState: 'output:state',
  requestOutputState: 'output:request',
  getDisplayInfo: 'display:get',
  displayInfo: 'display:info',
  toggleOutput: 'output:toggle',
  listMedia: 'media:list',
  addMedia: 'media:add',
  removeMedia: 'media:remove',
  pickBibleFile: 'bible:pick',
  listBibles: 'bible:list',
  saveBible: 'bible:save',
  removeBible: 'bible:remove'
} as const
