let branchFaves = new Set();
let branchAvoids = new Set();
let storyletFaves = new Set();
let storyletAvoids = new Set();
let cardFaves = new Set();
let cardAvoids = new Set();
const options = {};

let wrapObserver;
let observer;

const version = chrome.runtime.getManifest().version;

async function init() {
  chrome.storage.onChanged.addListener(onStorageChange);

  const event = new CustomEvent('PlayingFavouritesLoad');
  window.dispatchEvent(event);

  window.addEventListener('PlayingFavouritesLoad', suicide, false);

  console.log(`Playing Favourites ${version} injected`);

  wrapObserver = new MutationSummary({
    rootNode: document.getElementById('root'),
    callback: async function(summaries) {
      if (summaries[0].added.length === 1) {
        await loadData();
        await registerObserver();
      }
    },
    queries: [{element: '#main'}],
  });

  // True in case of reinject
  if (document.getElementById('main')) {
    await loadData();
    await registerObserver();
  }
}

init();

async function registerObserver() {
  if (observer) observer.disconnect();
  observer = new MutationSummary({
    rootNode: document.getElementById('main'),
    callback: function(summaries) {
      fillClickHandlers();
      parseStorylets(true);
      parseCards();
    },
    queries: [{attribute: 'data-branch-id'}, {attribute: 'data-event-id'}, {attribute: 'disabled'}],
  });
  fillClickHandlers();
  parseStorylets(true);
  parseCards();
}

// Gracefully shut down orphaned instance
function suicide() {
  console.log(`Playing Favourites ${version} content script orphaned`);
  wrapObserver.disconnect();
  observer.disconnect();
  window.removeEventListener('PlayingFavouritesLoad', suicide);
  document.getElementById('main').removeEventListener('click', protectAvoids, true);
}

function pageInject(func) {
  // Inject into the page context
  const s = document.createElement('script');
  s.textContent = '(' + func + ')();';
  (document.head || document.documentElement).appendChild(s);
  s.parentNode.removeChild(s);
}

// Make inline click/submit handlers visible to the isolated world
function fillClickHandlers() {
  // Record original button labels
  $('.storylet .button--go, .card__discard-button').each(function() {
    if (!this.dataset.originalValue) {
      this.dataset.originalValue = this.value;
    }
  });
}

function parseStorylets(reorder = false) { // Call without options to ensure no reordering
  const $container = $('#main');
  const $branches = $('#main .\\.media--branch');
  const $storylets = $('#main .storylet');

  let reorderActive = false;
  let reorderLocked = false;
  if (reorder) {
    switch (options.branch_reorder_mode) {
    case 'branch_no_reorder':
      break;
    case 'branch_reorder_active':
      reorderActive = true;
      break;
    case 'branch_reorder_all':
      reorderActive = true;
      reorderLocked = true;
      break;
    }
  }

  let $faves;
  let $avoids;

  let $first;
  let $lastActive;
  let $last;

  if ($branches.length) {
    $branches.each(function() {
      const match = this.dataset.branchId;
      if (match) {
        const branchId = parseInt(match);
        const active = $(this).hasClass('media--locked');

        $(this).find('.fave_toggle_button').remove();

        if ($(this).find('.button--go').prop('offsetParent') === null) {
          return;
        } // Fix for Protector extensions

        const $toggleButton = $('<input type="image" class="fave_toggle_button" title="Playing Favourites: toggle favourite">');
        $toggleButton.insertAfter($(this).find('.button--go').last()); // In case of insufficient actions, there are 2 buttons
        $toggleButton.attr('data-active', active);
        $toggleButton.attr('data-toggle-id', branchId);
        $toggleButton.click(branchToggle);

        if (branchFaves.has(branchId)) {
          $(this).addClass('storylet_favourite');
          $(this).removeClass('storylet_avoid');
          $toggleButton.attr('src', chrome.runtime.getURL('img/button_filled.png'));
        } else if (branchAvoids.has(branchId)) {
          $(this).removeClass('storylet_favourite');
          $(this).addClass('storylet_avoid');
          $toggleButton.attr('src', chrome.runtime.getURL('img/button_avoid.png'));
        } else {
          $(this).removeClass('storylet_favourite');
          $(this).removeClass('storylet_avoid');
          $toggleButton.attr('src', chrome.runtime.getURL('img/button_empty.png'));
        }
      }
    });

    $branches.first().parent().before('<div class="first_reorder_marker">');
    $first = $('.first_reorder_marker');

    $branches.last().parent().after('<div class="last_reorder_marker">');
    $last = $('.last_reorder_marker');

    if ($branches.not('.media--locked').last().length) {
      $branches.not('.media--locked').last().parent().after('<div class="last_active_reorder_marker">');
      $lastActive = $('.last_active_reorder_marker');
    } else {
      $lastActive = $last;
    }

    $faves = $branches.filter('.storylet_favourite');
    $avoids = $branches.filter('.storylet_avoid');
  } else if ($storylets.length) {
    $storylets.each(function() {
      const match = $(this).parent().get(0).dataset.branchId;

      if (match) {
        const storyletId = parseInt(match);
        const active = $(this).hasClass('media--locked');

        $(this).find('.fave_toggle_button').remove();

        if ($(this).find('.button--go').prop('offsetParent') === null) {
          return;
        } // Fix for Protector extensions

        const $toggleButton = $('<input type="image" class="fave_toggle_button" title="Playing Favourites: toggle favourite">');
        $toggleButton.insertAfter($(this).find('.button--go'));
        $toggleButton.attr('data-active', active);
        $toggleButton.attr('data-toggle-id', storyletId);
        $toggleButton.click(storyletToggle);

        if (storyletFaves.has(storyletId)) {
          $(this).addClass('storylet_favourite');
          $(this).removeClass('storylet_avoid');
          $toggleButton.attr('src', chrome.runtime.getURL('img/button_filled.png'));
        } else if (storyletAvoids.has(storyletId)) {
          $(this).removeClass('storylet_favourite');
          $(this).addClass('storylet_avoid');
          $toggleButton.attr('src', chrome.runtime.getURL('img/button_avoid.png'));
        } else {
          $(this).removeClass('storylet_favourite');
          $(this).removeClass('storylet_avoid');
          $toggleButton.attr('src', chrome.runtime.getURL('img/button_empty.png'));
        }
      }
    });

    $storylets.first().parent().before('<div class="first_reorder_marker">');
    $first = $('.first_reorder_marker');

    $storylets.last().parent().after('<div class="last_reorder_marker">');
    $last = $('.last_reorder_marker');

    if ($storylets.not('.media--locked').last().length) {
      $storylets.not('.media--locked').last().parent().after('<div class="last_active_reorder_marker">');
      $lastActive = $('.last_active_reorder_marker');
    } else {
      $lastActive = $last;
    }

    $faves = $storylets.filter('.storylet_favourite');
    $avoids = $storylets.filter('.storylet_avoid');
  }

  if ($faves && $faves.length) {
    if (reorderLocked) {
      $faves.filter('.media--locked').parent().insertBefore($first);
    }
    if (reorderActive) {
      $faves.not('.media--locked').parent().insertBefore($first);
    }
  }

  if ($avoids && $avoids.length) {
    if (reorderLocked) {
      $avoids.filter('.media--locked').parent().insertAfter($lastActive);
    }
    if (reorderActive) {
      $avoids.not('.media--locked').parent().insertAfter($lastActive);
    }
  }

  $('.first_reorder_marker, .last_active_reorder_marker, .last_reorder_marker').remove();
}

function parseCards() {
  const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

  // full-sized cards
  const $cards = $('#main .hand__card-container, #main .small-card-container');

  $cards.each(function() {
    let match;
    if (this.dataset.eventId) {
      match = this.dataset.eventId;
    }

    if (match) {
      const cardId = parseInt(match);

      $(this).find('.card_toggle_button').remove();

      if (this.offsetParent === null) {
        return;
      } // Fix for Protector extensions

      const $toggleButton = $('<button class="card_toggle_button" title="Playing Favourites: toggle favourite" />');

      if ($(this).hasClass('hand__card-container')) {
        $(this).append($toggleButton);
      } else {
        $(this).find('.buttons').append($toggleButton);
      }

      $toggleButton.attr('data-toggle-id', cardId);

      $toggleButton.click(cardToggle);

      const $cardDiscard = $(this).find('.card__discard-button, .buttonlet-delete');

      const ffCardFaveClass = isFirefox ? 'firefox_card_fave' : '';
      const ffCardAvoidClass = isFirefox ? 'firefox_card_avoid' : '';
      const ffCardEmptyClass = isFirefox ? 'firefox_card_empty' : '';

      $(this).addClass(ffCardEmptyClass);

      if (cardAvoids.has(cardId)) {
        $(this).removeClass('card_fave');
        $(this).addClass('card_avoid');
        $(this).removeClass(ffCardFaveClass);
        $(this).addClass(ffCardAvoidClass);
        $cardDiscard.addClass('button_fave');
        $cardDiscard.removeClass('button_avoid');
      } else if (cardFaves.has(cardId)) {
        $(this).addClass('card_fave');
        $(this).removeClass('card_avoid');
        $(this).removeClass(ffCardAvoidClass);
        $(this).addClass(ffCardFaveClass);
        $cardDiscard.removeClass('button_fave');
        $cardDiscard.addClass('button_avoid');
      } else {
        $(this).removeClass('card_fave');
        $(this).removeClass('card_avoid');
        $(this).removeClass(ffCardFaveClass);
        $(this).removeClass(ffCardAvoidClass);
        $cardDiscard.removeClass('button_fave');
        $cardDiscard.removeClass('button_avoid');
      }
    }
  });
}

async function onStorageChange(changes, area) {
  if (area === 'local') {
    await loadData();
    parseStorylets();
    parseCards();
  }
}

async function loadData() {
  data = await getOptions();

  branchFaves = unpackSet(data, 'branchFaves');
  branchAvoids = unpackSet(data, 'branchAvoids');
  storyletFaves = unpackSet(data, 'storyletFaves');
  storyletAvoids = unpackSet(data, 'storyletAvoids');
  cardFaves = unpackSet(data, 'cardFaves');
  cardAvoids = unpackSet(data, 'cardAvoids');

  options.branch_reorder_mode = data.branch_reorder_mode;
  options.switch_mode = data.switch_mode;
  options.protectInterval = 2000; // TODO: Make configurable

  // initializeProtector(); // TODO: Finish implementation
}

function protectAvoids(e) {
  if (e.metaKey || e.ctrlKey) {
    return;
  } // Ctrl-click always bypasses protection

  // If clicked on branch selection OR button set to avoid
  if ($(e.target).is('.storylet_avoid .button--go span, .button_avoid')) {
    const time = Date.now();
    if (
      !e.target.dataset.protectTimestamp ||
      (time - e.target.dataset.protectTimestamp) >= options.protectInterval
    ) {
      // Prevent page's inline handler from firing
      e.stopImmediatePropagation();
      e.preventDefault();

      const $confirmText = $('<span class="protect-confirm">SURE?</span>');
      $(e.target).append($confirmText);
      $(e.target).addClass('button-protected');
      setTimeout(
        function() {
          $(e.target).removeClass('button-protected');
          $confirmText.remove();
        },
        options.protectInterval,
      );

      e.target.dataset.protectTimestamp = time;
    }
  }
}

function initializeProtector() {
  // Intercept clicks to avoided elements
  document.getElementById('main').addEventListener(
    'click',
    protectAvoids,
    true, // Capture before it reaches inline onclick
  );
}

async function branchToggle(e) {
  e.preventDefault();

  const branchId = parseInt(this.dataset.toggleId);

  switch (options.switch_mode) {
  case 'modifier_click':
    const modifier = (e.metaKey || e.ctrlKey);
    if (modifier) {
      if (branchAvoids.has(branchId)) {
        await setBranchFave(branchId, 'none');
      } else {
        await setBranchFave(branchId, 'avoid');
      }
    } else {
      if (branchFaves.has(branchId)) {
        await setBranchFave(branchId, 'none');
      } else {
        await setBranchFave(branchId, 'fave');
      }
    }
    break;
  case 'click_through':
    if (branchFaves.has(branchId)) {
      await setBranchFave(branchId, 'avoid');
    } else if (branchAvoids.has(branchId)) {
      await setBranchFave(branchId, 'none');
    } else {
      await setBranchFave(branchId, 'fave');
    }
    break;
  }
}

function storyletToggle(e) {
  e.preventDefault();

  const storyletId = parseInt(this.dataset.toggleId);

  switch (options.switch_mode) {
  case 'modifier_click':
    const modifier = (e.metaKey || e.ctrlKey);
    if (modifier) {
      if (storyletAvoids.has(storyletId)) {
        setStoryletFave(storyletId, 'none');
      } else {
        setStoryletFave(storyletId, 'avoid');
      }
    } else {
      if (storyletFaves.has(storyletId)) {
        setStoryletFave(storyletId, 'none');
      } else {
        setStoryletFave(storyletId, 'fave');
      }
    }
    break;
  case 'click_through':
    if (storyletFaves.has(storyletId)) {
      setStoryletFave(storyletId, 'avoid');
    } else if (storyletAvoids.has(storyletId)) {
      setStoryletFave(storyletId, 'none');
    } else {
      setStoryletFave(storyletId, 'fave');
    }
    break;
  }
}

function cardToggle(e) {
  e.preventDefault();

  const cardId = parseInt(this.dataset.toggleId);

  switch (options.switch_mode) {
  case 'modifier_click':
    const modifier = (e.metaKey || e.ctrlKey);
    if (modifier) {
      if (cardAvoids.has(cardId)) {
        setCardFave(cardId, 'none');
      } else {
        setCardFave(cardId, 'avoid');
      }
    } else {
      if (cardFaves.has(cardId)) {
        setCardFave(cardId, 'none');
      } else {
        setCardFave(cardId, 'fave');
      }
    }
    break;
  case 'click_through':
    if (cardAvoids.has(cardId)) {
      setCardFave(cardId, 'none');
    } else if (cardFaves.has(cardId)) {
      setCardFave(cardId, 'avoid');
    } else {
      setCardFave(cardId, 'fave');
    }
    break;
  }
}

async function saveFaves() {
  const data = {};

  Object.assign(data, branchFaves.pack('branchFaves'));
  Object.assign(data, branchAvoids.pack('branchAvoids'));
  Object.assign(data, storyletFaves.pack('storyletFaves'));
  Object.assign(data, storyletAvoids.pack('storyletAvoids'));
  Object.assign(data, cardFaves.pack('cardFaves'));
  Object.assign(data, cardAvoids.pack('cardAvoids'));

  await setOptions(data);
}

async function setBranchFave(branchId, mode) {
  switch (mode) {
  case 'none':
    branchFaves.delete(branchId);
    branchAvoids.delete(branchId);
    break;
  case 'avoid':
    branchFaves.delete(branchId);
    branchAvoids.add(branchId);
    break;
  case 'fave':
    branchFaves.add(branchId);
    branchAvoids.delete(branchId);
    break;
  }
  await saveFaves();
  parseStorylets();
}

async function setStoryletFave(storyletId, mode) {
  switch (mode) {
  case 'none':
    storyletFaves.delete(storyletId);
    storyletAvoids.delete(storyletId);
    break;
  case 'avoid':
    storyletFaves.delete(storyletId);
    storyletAvoids.add(storyletId);
    break;
  case 'fave':
    storyletFaves.add(storyletId);
    storyletAvoids.delete(storyletId);
    break;
  }
  await saveFaves();
  parseStorylets();
}

async function setCardFave(cardId, mode) {
  switch (mode) {
  case 'none':
    cardAvoids.delete(cardId);
    cardFaves.delete(cardId);
    break;
  case 'fave':
    cardAvoids.delete(cardId);
    cardFaves.add(cardId);
    break;
  case 'avoid':
    cardAvoids.add(cardId);
    cardFaves.delete(cardId);
    break;
  }
  await saveFaves();
  parseCards();
}
