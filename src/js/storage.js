// Set <-> extension storage conversion

const MAX_MAP_ITEMS_PER_KEY = 512;

Set.prototype.pack = function(storageKey) {
  const source = Array.from(this).sort();
  const total = source.length;
  const keys = [];
  const result = {};

  for (let index = 0; index * MAX_MAP_ITEMS_PER_KEY < total; index++) {
    result[`${storageKey}_${index}`] = source.slice(
      index * MAX_MAP_ITEMS_PER_KEY,
      (index + 1) * MAX_MAP_ITEMS_PER_KEY,
    );
    keys.push(`${storageKey}_${index}`);
  }

  result[`${storageKey}_keys`] = keys;
  return result;
};

function unpackSet(data, storageKey) {
  let result = new Set();
  if (Array.isArray(data[`${storageKey}_keys`])) {
    for (const key of data[`${storageKey}_keys`]) {
      result = new Set([...result, ...data[key]]);
    }
  }
  return result;
}

// Storage interfaces

const defaultOptions = {
  branch_reorder_mode: 'branch_reorder_active',
  switch_mode: 'click_through',

  branch_faves_keys: [],
  branch_avoids_keys: [],
  storylet_faves_keys: [],
  storylet_avoids_keys: [],
  card_protects_keys: [],
  card_discards_keys: [],

  storage_schema: 2,
};

function getOption(key) {
  return new Promise((resolve, reject) => {
    if (key in defaultOptions) {
      chrome.storage.local.get({[key]: defaultOptions[key]}, (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data[key]);
        }
      });
    } else {
      chrome.storage.local.get(key, (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data[key]);
        }
      });
    }
  });
}

function setOption(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({[key]: value}, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function getOptions() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, (allAata) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        chrome.storage.local.get(defaultOptions, function(dataOverlay) {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            Object.assign(allAata, dataOverlay);
            resolve(allAata);
          }
        });
      }
    });
  });
}

function setOptions(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}
