import { ref } from 'vue';

const SEARCH_DEBOUNCE_MS = 400;

const searchInput = ref('');
const debouncedSearch = ref('');
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDebounce() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    debouncedSearch.value = searchInput.value.trim();
    searchDebounceTimer = null;
  }, SEARCH_DEBOUNCE_MS);
}

function onSearchInput(value: string) {
  searchInput.value = value;
  scheduleDebounce();
}

/** Apply the current input immediately (e.g. Enter). */
function flushSearch() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
  debouncedSearch.value = searchInput.value.trim();
}

function resetSearch() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
  searchInput.value = '';
  debouncedSearch.value = '';
}

/**
 * Shared admin header search state (one active section at a time).
 * Layout owns the input; list pages watch `debouncedSearch`.
 */
export function useAdminHeaderSearch() {
  return {
    searchInput,
    debouncedSearch,
    onSearchInput,
    flushSearch,
    resetSearch,
    SEARCH_DEBOUNCE_MS,
  };
}
