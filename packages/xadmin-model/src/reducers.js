
import _ from 'lodash'
import { combineReducers } from './utils'

const cacheDuration = 10 * 60 * 1000 // ten minutes

const addRecords = (newRecords = [], oldRecords, partial) => {
  // prepare new records and timestamp them
  const newRecordsById = newRecords.reduce((prev, record) => {
    prev[record.id] = record
    return prev
  }, {})
  const now = new Date()
  const newRecordsFetchedAt = newRecords.reduce((prev, record) => {
    prev[record.id] = now
    return prev
  }, {})
  // remove outdated old records
  const latestValidDate = new Date()
  latestValidDate.setTime(latestValidDate.getTime() - cacheDuration)
  const oldValidRecordIds = Object.keys(oldRecords.fetchedAt)
    .filter(id => oldRecords.fetchedAt[id] > latestValidDate)
  const oldValidRecords = oldValidRecordIds.reduce((prev, id) => {
    prev[id] = oldRecords[id]
    return prev
  }, {})
  const oldValidRecordsFetchedAt = oldValidRecordIds.reduce((prev, id) => {
    prev[id] = oldRecords.fetchedAt[id]
    return prev
  }, {})
  // combine old records and new records
  const records = {
    ...oldValidRecords,
    ...(partial ? Object.keys(newRecordsById).reduce((prev, id) => {
      prev[id] = oldValidRecords[id] ? { ...oldValidRecords[id], ...newRecordsById[id] } : newRecordsById[id]
      return prev
    }, {}) : newRecordsById)
  }
  Object.defineProperty(records, 'fetchedAt', { value: {
    ...oldValidRecordsFetchedAt,
    ...newRecordsFetchedAt
  } })
  return records
}

const initialState = {}
Object.defineProperty(initialState, 'fetchedAt', { value: {} })

const reducers = combineReducers({
  items: (state = initialState, action) => {
    switch (action.type) {
      case 'GET_ITEMS':
        return action.items != undefined ? addRecords(action.items, state) : state
      case 'GET_ITEM':
        return action.success === true ? addRecords([ action.item ], state) : state
      case 'SAVE_ITEM':
        return action.success === true ? addRecords([ action.item ], state, action.partial) : state
      default:
        return state
    }
  },
  ids: (state = [], action) => {
    switch (action.type) {
      case 'GET_ITEMS':
        return action.items != undefined ? action.items.map(record => record.id) : state
      default:
        return state
    }
  },
  selected: (state = [], action) => {
    switch (action.type) {
      case 'SELECT_ITEMS': {
        let selectedItems = state
        if(action.item) {
          selectedItems = state.filter(item => { return item.id !== action.item.id })
          if (action.selected) {
            selectedItems.push(action.item)
          }
        } 
        if(action.items) {
          if (action.selected) {
            selectedItems = _.unionWith(selectedItems, action.items, (a, b) => a.id == b.id)
          } else {
            const ids = action.items.map(i=>i.id)
            selectedItems = _.dropWhile(selectedItems, (i) => ids.indexOf(i.id) > -1)
          }
        }
        return selectedItems
      }
      case 'SELECT_CLEAR':
        return []
      default:
        return state
    }
  },
  filter: (state = { fields: [], order: {}, limit: 15, skip: 0 }, action) => {
    switch (action.type) {
      case 'INITIALIZE': {
        const model = action.model
        return { fields: [].concat(model.listFields), order: model.orders || {}, limit: model.defaultPageSize || 15, skip: 0 }
      }
      case 'UPDATE_FILTER':
        return { ...state, ...action.payload }
      case 'GET_ITEMS':
        return action.items && action.filter || state
      default:
        return state
    }
  },
  wheres: (state = {}, action) => {
    switch (action.type) {
      case 'UPDATE_WHERE':
        if(action.payload) {
          return { ...state, [action.key]: action.payload }
        } else {
          return _.omit(state, action.key)
        }
      case 'GET_ITEMS':
        return action.items && action.wheres || state
      default:
        return state
    }
  },
  count: (state = 0, action) => {
    switch (action.type) {
      case 'GET_ITEMS':
        return action.count === undefined ? state : action.count
      default:
        return state
    }
  }
})

export default reducers
