/**
 * RupeeFlow - Personal Finance & Wealth Manager
 * Self-contained, zero-database, ultra-fast client-side finance application.
 */

// ==========================================
// 1. DEFAULT DATA & CONSTANTS
// ==========================================

const DEFAULT_CATEGORIES = [
  // Expense Categories (Earthy Scandinavian Tones)
  { id: 'cat-food', name: 'Food & Dining', type: 'EXPENSE', color: '#c4823f', icon: '', isDefault: true },
  { id: 'cat-groceries', name: 'Groceries & Provisions', type: 'EXPENSE', color: '#588157', icon: '', isDefault: true },
  { id: 'cat-rent', name: 'Housing & Rent', type: 'EXPENSE', color: '#2b3a42', icon: '', isDefault: true },
  { id: 'cat-bills', name: 'Utilities & Bills', type: 'EXPENSE', color: '#4a5568', icon: '', isDefault: true },
  { id: 'cat-transport', name: 'Transit & Fuel', type: 'EXPENSE', color: '#3d5a80', icon: '', isDefault: true },
  { id: 'cat-shopping', name: 'Personal & Shopping', type: 'EXPENSE', color: '#bc6c25', icon: '', isDefault: true },
  { id: 'cat-health', name: 'Healthcare', type: 'EXPENSE', color: '#b84a39', icon: '', isDefault: true },
  { id: 'cat-ott', name: 'Subscriptions', type: 'EXPENSE', color: '#6b705c', icon: '', isDefault: true },
  { id: 'cat-invest', name: 'Investments & SIP', type: 'EXPENSE', color: '#2d6a4f', icon: '', isDefault: true },
  { id: 'cat-emi', name: 'EMI & Loans', type: 'EXPENSE', color: '#8d5b4c', icon: '', isDefault: true },
  { id: 'cat-misc', name: 'General Sundry', type: 'EXPENSE', color: '#7d766c', icon: '', isDefault: true },

  // Income Categories
  { id: 'cat-allowance', name: 'Allowance & Family Support', type: 'INCOME', color: '#588157', icon: '', isDefault: true },
  { id: 'cat-salary', name: 'Primary Salary', type: 'INCOME', color: '#2d6a4f', icon: '', isDefault: true },
  { id: 'cat-freelance', name: 'Advisory & Freelance', type: 'INCOME', color: '#3d5a80', icon: '', isDefault: true },
  { id: 'cat-business', name: 'Business Revenue', type: 'INCOME', color: '#2b3a42', icon: '', isDefault: true },
  { id: 'cat-invest-returns', name: 'Dividends & Interest', type: 'INCOME', color: '#c4823f', icon: '', isDefault: true },
  { id: 'cat-cashback', name: 'Rebates & Rewards', type: 'INCOME', color: '#588157', icon: '', isDefault: true },
  { id: 'cat-other-inc', name: 'Other Income', type: 'INCOME', color: '#7d766c', icon: '', isDefault: true }
];

const DEFAULT_BUDGETS = {};

// ==========================================
// 2. STATE MANAGEMENT & STORAGE
// ==========================================

function getInitialView() {
  try {
    const validViews = ['dashboard', 'transactions', 'budgets', 'analytics', 'categories'];
    const hash = window.location.hash.replace('#', '').trim().toLowerCase();
    if (hash === 'insights') return 'analytics';
    if (validViews.includes(hash)) return hash;

    const saved = localStorage.getItem('rupeeflow_active_view');
    if (saved && validViews.includes(saved)) return saved;
  } catch (err) {
    console.warn('Could not determine initial view:', err);
  }
  return 'dashboard';
}

const State = {
  transactions: [],
  categories: [],
  budgets: {},
  monthlyBudget: Number(localStorage.getItem('rupeeflow_monthly_budget')) || 0,
  activeView: getInitialView(),
  selectedMonth: getCurrentYearMonth(), // 'YYYY-MM'
  theme: localStorage.getItem('rupeeflow_theme') || 'light',

  // Transactions View Pagination & Filters
  filters: {
    search: '',
    type: 'ALL',
    category: 'ALL',
    payment: 'ALL',
    startDate: '',
    endDate: ''
  },
  currentPage: 1,
  pageSize: 15,

  // Chart Instances
  charts: {
    categoryDoughnut: null,
    cashflowBar: null,
    analyticsFlow: null,
    analyticsPayment: null
  }
};

// ==========================================
// 3. INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadData();
  setupEventListeners();
  populateMonthSelect();
  renderAllViews();
  // Restore persisted active view across page reloads
  switchView(State.activeView, true);
});

// Support browser Back/Forward navigation
window.addEventListener('hashchange', () => {
  const target = getInitialView();
  if (target !== State.activeView) {
    switchView(target, false);
  }
});

function initTheme() {
  document.documentElement.setAttribute('data-theme', State.theme);
}

async function loadData() {
  // 1. Instant load from localStorage
  try {
    const rawTx = localStorage.getItem('rupeeflow_transactions');
    const rawCat = localStorage.getItem('rupeeflow_categories');
    const rawBudgets = localStorage.getItem('rupeeflow_budgets');

    State.transactions = rawTx ? JSON.parse(rawTx) : [];
    State.categories = rawCat ? JSON.parse(rawCat) : DEFAULT_CATEGORIES;
    DEFAULT_CATEGORIES.forEach(defCat => {
      if (!State.categories.some(c => c.id === defCat.id)) {
        State.categories.push(defCat);
      }
    });
    State.budgets = rawBudgets ? JSON.parse(rawBudgets) : {};
    State.monthlyBudget = Number(localStorage.getItem('rupeeflow_monthly_budget')) || 0;
  } catch (err) {
    console.error('Error loading localStorage data:', err);
    State.categories = DEFAULT_CATEGORIES;
    State.budgets = {};
    State.monthlyBudget = 0;
    State.transactions = [];
  }

  // 2. Dual-Sync: Check local disk file (expenses.json)
  if (window.location.protocol.startsWith('http')) {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.exists && json.data) {
          State.transactions = Array.isArray(json.data.transactions) ? json.data.transactions : State.transactions;
          if (Array.isArray(json.data.categories) && json.data.categories.length) {
            State.categories = json.data.categories;
          }
          if (json.data.budgets) {
            State.budgets = json.data.budgets;
          }
          if (json.data.monthlyBudget !== undefined) {
            State.monthlyBudget = Number(json.data.monthlyBudget) || 0;
          }
          // Keep localStorage in exact mirror sync
          localStorage.setItem('rupeeflow_transactions', JSON.stringify(State.transactions));
          localStorage.setItem('rupeeflow_categories', JSON.stringify(State.categories));
          localStorage.setItem('rupeeflow_budgets', JSON.stringify(State.budgets));
          localStorage.setItem('rupeeflow_monthly_budget', State.monthlyBudget.toString());
          updateSyncIndicator(true, 'Disk & Browser Synced');
          populateMonthSelect();
          renderAllViews();
          switchView(State.activeView, false);
        } else {
          // If expenses.json doesn't exist yet on disk, create it with current state
          await saveData();
          updateSyncIndicator(true, 'Disk & Browser Synced');
        }
      } else {
        updateSyncIndicator(false, 'Browser Storage (Local)');
      }
    } catch (e) {
      console.log('Operating in standalone browser mode');
      updateSyncIndicator(false, 'Browser Storage (Local)');
    }
  } else {
    updateSyncIndicator(false, 'Browser Storage (Local)');
  }
}

async function saveData(notifySuccess = false) {
  // 1. Browser LocalStorage (instant 0ms)
  localStorage.setItem('rupeeflow_transactions', JSON.stringify(State.transactions));
  localStorage.setItem('rupeeflow_categories', JSON.stringify(State.categories));
  localStorage.setItem('rupeeflow_budgets', JSON.stringify(State.budgets));
  localStorage.setItem('rupeeflow_monthly_budget', State.monthlyBudget.toString());

  // 2. Hard Drive Local File (expenses.json)
  let diskSuccess = false;
  if (window.location.protocol.startsWith('http')) {
    const payload = {
      transactions: State.transactions,
      categories: State.categories,
      budgets: State.budgets,
      monthlyBudget: State.monthlyBudget,
      lastSaved: new Date().toISOString()
    };
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        diskSuccess = true;
        updateSyncIndicator(true, 'Disk & Browser Synced');
      } else {
        updateSyncIndicator(false, 'Browser Storage (Local)');
      }
    } catch (err) {
      console.warn('Could not sync to local disk file:', err);
      updateSyncIndicator(false, 'Browser Storage (Local)');
    }
  } else {
    updateSyncIndicator(false, 'Browser Storage (Local)');
  }

  if (notifySuccess) {
    if (diskSuccess) {
      showToast('Successfully synced to expenses.json and browser storage!', 'success');
    } else {
      showToast('Saved to browser localStorage (Local Server offline)', 'info');
    }
  }
}

function updateSyncIndicator(isDiskActive, labelText) {
  const btnSettings = document.getElementById('btn-open-settings');
  if (btnSettings) {
    btnSettings.title = isDiskActive
      ? 'Data Storage & Persistence (Disk & Browser Synced)'
      : 'Data Storage & Persistence (Browser Storage)';
  }

  const statusDiskEl = document.getElementById('storage-status-disk');
  const statusLocalEl = document.getElementById('storage-status-local');
  const lastSavedEl = document.getElementById('storage-last-saved');

  if (statusDiskEl) {
    statusDiskEl.innerHTML = isDiskActive
      ? '<span class="status-badge badge-active">Connected (Disk)</span>'
      : '<span class="status-badge badge-muted">Inactive (Offline)</span>';
  }
  if (statusLocalEl) {
    statusLocalEl.innerHTML = '<span class="status-badge badge-active">Active (Browser)</span>';
  }
  if (lastSavedEl) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastSavedEl.textContent = `Both storage engines active. Last auto-sync: ${timeStr}.`;
  }
}

// ==========================================
// 4. CURRENCY & DATE UTILITIES (INDIAN LOCALE)
// ==========================================

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatINR(amount, includePaisa = false) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includePaisa ? 2 : 0,
    maximumFractionDigits: includePaisa ? 2 : 0
  }).format(num);
}

function formatAmountCompactINR(num) {
  const abs = Math.abs(num);
  if (abs >= 10000000) {
    return '₹' + (num / 10000000).toFixed(2) + ' Cr';
  } else if (abs >= 100000) {
    return '₹' + (num / 100000).toFixed(2) + ' Lakh';
  } else if (abs >= 1000) {
    return '₹' + (num / 1000).toFixed(1) + ' k';
  }
  return formatINR(num);
}

function getCurrentYearMonth() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatPaymentLabel(method) {
  const map = {
    UPI: 'UPI (GPay / PhonePe)',
    CARD: 'Credit/Debit Card',
    NET_BANKING: 'Net Banking',
    CASH: 'Cash',
    BANK_TRANSFER: 'Bank / Cash Deposit'
  };
  return map[method] || method;
}

// ==========================================
// 5. EVENT LISTENERS & NAVIGATION
// ==========================================

function setupEventListeners() {
  // Navigation tabs
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      switchView(view);
    });
  });

  // Global "N" keyboard shortcut for new transaction
  window.addEventListener('keydown', (e) => {
    if (e.key === 'n' || e.key === 'N') {
      const activeTag = document.activeElement.tagName;
      if (activeTag !== 'INPUT' && activeTag !== 'SELECT' && activeTag !== 'TEXTAREA') {
        e.preventDefault();
        openAddModal();
      }
    } else if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Theme Toggle
  document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

  // Storage & Backup Button (Download Icon in Navbar)
  const btnSettings = document.getElementById('btn-open-settings');
  if (btnSettings) btnSettings.addEventListener('click', openSettingsModal);

  const btnManualSync = document.getElementById('btn-manual-sync');
  if (btnManualSync) {
    btnManualSync.addEventListener('click', async () => {
      await saveData(true);
    });
  }
  document.getElementById('btn-export-json').addEventListener('click', exportDataJSON);
  document.getElementById('btn-export-csv').addEventListener('click', exportDataCSV);
  document.getElementById('btn-export-csv-direct').addEventListener('click', exportDataCSV);
  document.getElementById('import-json-file').addEventListener('change', importDataJSON);
  document.getElementById('btn-reset-all-data').addEventListener('click', resetAllData);

  // Add Modals triggers
  document.getElementById('btn-open-add-modal').addEventListener('click', () => openAddModal());
  document.getElementById('btn-quick-clear').addEventListener('click', startFresh);

  // Dev-only feature: Show Demo Data button only in local development (localhost / 127.0.0.1) or with ?dev=true
  const isDevMode = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    new URLSearchParams(window.location.search).get('dev') === 'true';

  const btnSeed = document.getElementById('btn-seed-sample-data');
  if (btnSeed) {
    if (isDevMode) {
      btnSeed.style.display = 'inline-flex';
      btnSeed.addEventListener('click', () => seedSampleTransactions(true));
    } else {
      btnSeed.style.display = 'none';
    }
  }
  document.getElementById('btn-see-all-tx').addEventListener('click', () => switchView('transactions'));
  document.getElementById('btn-open-budget-modal').addEventListener('click', openBudgetModal);
  
  const btnOpenMonthly = document.getElementById('btn-open-monthly-budget-modal');
  if (btnOpenMonthly) btnOpenMonthly.addEventListener('click', openMonthlyBudgetModal);

  const btnEditMonthlyCap = document.getElementById('btn-edit-monthly-cap');
  if (btnEditMonthlyCap) btnEditMonthlyCap.addEventListener('click', openMonthlyBudgetModal);

  const formMonthlyBudget = document.getElementById('monthly-budget-form');
  if (formMonthlyBudget) formMonthlyBudget.addEventListener('submit', handleMonthlyBudgetSubmit);

  const btnRemoveMonthly = document.getElementById('btn-remove-monthly-budget');
  if (btnRemoveMonthly) btnRemoveMonthly.addEventListener('click', removeMonthlyBudget);

  const modalMonthly = document.getElementById('modal-monthly-budget');
  if (modalMonthly) {
    modalMonthly.addEventListener('click', (e) => {
      if (e.target === modalMonthly) closeMonthlyBudgetModal();
    });
  }

  const modalBudget = document.getElementById('modal-budget');
  if (modalBudget) {
    modalBudget.addEventListener('click', (e) => {
      if (e.target === modalBudget) closeBudgetModal();
    });
  }

  document.getElementById('btn-open-category-modal').addEventListener('click', openCategoryModal);

  // Dashboard Month Select
  document.getElementById('dashboard-month-select').addEventListener('change', (e) => {
    State.selectedMonth = e.target.value;
    renderDashboard();
    renderBudgets();
  });

  // Transaction Form Handling
  document.getElementById('tx-form').addEventListener('submit', handleTxSubmit);
  document.querySelectorAll('input[name="tx-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      populateCategorySelects(radio.value);
    });
  });

  // Live amount in words helper
  document.getElementById('tx-amount').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const hint = document.getElementById('tx-amount-in-words');
    if (!isNaN(val) && val > 0) {
      hint.textContent = `Formatted: ${formatINR(val, true)} (${formatAmountCompactINR(val)})`;
    } else {
      hint.textContent = '';
    }
  });

  // Filter toolbar triggers
  document.getElementById('tx-search-input').addEventListener('input', (e) => {
    State.filters.search = e.target.value.trim().toLowerCase();
    State.currentPage = 1;
    renderTransactionsTable();
  });

  document.getElementById('tx-filter-type').addEventListener('change', (e) => {
    State.filters.type = e.target.value;
    State.currentPage = 1;
    renderTransactionsTable();
  });

  document.getElementById('tx-filter-category').addEventListener('change', (e) => {
    State.filters.category = e.target.value;
    State.currentPage = 1;
    renderTransactionsTable();
  });

  document.getElementById('tx-filter-payment').addEventListener('change', (e) => {
    State.filters.payment = e.target.value;
    State.currentPage = 1;
    renderTransactionsTable();
  });

  document.getElementById('tx-filter-start-date').addEventListener('change', (e) => {
    State.filters.startDate = e.target.value;
    State.currentPage = 1;
    renderTransactionsTable();
  });

  document.getElementById('tx-filter-end-date').addEventListener('change', (e) => {
    State.filters.endDate = e.target.value;
    State.currentPage = 1;
    renderTransactionsTable();
  });

  document.getElementById('btn-reset-filters').addEventListener('click', resetFilters);

  // Pagination buttons
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (State.currentPage > 1) {
      State.currentPage--;
      renderTransactionsTable();
    }
  });

  document.getElementById('btn-next-page').addEventListener('click', () => {
    State.currentPage++;
    renderTransactionsTable();
  });

  // Budget form submit
  document.getElementById('budget-form').addEventListener('submit', handleBudgetSubmit);

  // Category form submit
  document.getElementById('category-form').addEventListener('submit', handleCategorySubmit);

  // Color picker sync
  document.getElementById('cat-color-input').addEventListener('input', (e) => {
    document.getElementById('cat-color-label').textContent = e.target.value.toUpperCase();
  });

  // Analytics timeframe
  document.getElementById('analytics-timeframe-select').addEventListener('change', () => {
    renderAnalytics();
  });
}

function switchView(viewName, updateHash = true) {
  const validViews = ['dashboard', 'transactions', 'budgets', 'analytics', 'categories'];
  if (!validViews.includes(viewName)) {
    viewName = 'dashboard';
  }

  State.activeView = viewName;
  localStorage.setItem('rupeeflow_active_view', viewName);

  if (updateHash) {
    const currentHash = window.location.hash.replace('#', '').toLowerCase();
    const targetHash = viewName === 'analytics' ? 'insights' : viewName;
    if (currentHash !== targetHash && currentHash !== viewName) {
      history.replaceState(null, '', '#' + targetHash);
    }
  }

  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `view-${viewName}`);
  });

  if (viewName === 'dashboard') renderDashboard();
  else if (viewName === 'transactions') renderTransactionsTable();
  else if (viewName === 'budgets') renderBudgets();
  else if (viewName === 'analytics') renderAnalytics();
  else if (viewName === 'categories') renderCategories();
}

function toggleTheme() {
  State.theme = State.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', State.theme);
  localStorage.setItem('rupeeflow_theme', State.theme);
  // Re-render charts with updated theme colors
  renderDashboardCharts([], []);
  renderAnalytics();
}

// ==========================================
// 6. RENDER ALL VIEWS
// ==========================================

function renderAllViews() {
  populateCategorySelects();
  renderDashboard();
  renderTransactionsTable();
  renderBudgets();
  renderCategories();
  if (State.activeView === 'analytics') {
    renderAnalytics();
  }
}

function populateMonthSelect() {
  const select = document.getElementById('dashboard-month-select');
  select.innerHTML = '';

  // Collect distinct months from transactions + past 6 months
  const monthSet = new Set();
  monthSet.add(getCurrentYearMonth());

  // Past 6 months
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(mStr);
  }

  State.transactions.forEach(tx => {
    if (tx.date) {
      monthSet.add(tx.date.substring(0, 7));
    }
  });

  const sortedMonths = Array.from(monthSet).sort().reverse();

  sortedMonths.forEach(m => {
    const [year, month] = m.split('-');
    const label = new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric'
    });
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = label;
    if (m === State.selectedMonth) opt.selected = true;
    select.appendChild(opt);
  });
}

function populateCategorySelects(selectedType = 'EXPENSE') {
  // 1. Transaction form category select
  const txCatSelect = document.getElementById('tx-category');
  if (txCatSelect) {
    txCatSelect.innerHTML = '';
    const filteredCats = State.categories.filter(c => c.type === selectedType);
    filteredCats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      txCatSelect.appendChild(opt);
    });
  }

  // 2. Filter category select
  const filterCatSelect = document.getElementById('tx-filter-category');
  if (filterCatSelect) {
    const currentVal = filterCatSelect.value;
    filterCatSelect.innerHTML = '<option value="ALL">All Categories</option>';
    State.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.type === 'INCOME' ? 'Income' : 'Expense'})`;
      filterCatSelect.appendChild(opt);
    });
    filterCatSelect.value = currentVal;
  }

  // 3. Budget category select (Expense only)
  const budgetCatSelect = document.getElementById('budget-category-select');
  if (budgetCatSelect) {
    budgetCatSelect.innerHTML = '';
    State.categories.filter(c => c.type === 'EXPENSE').forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      budgetCatSelect.appendChild(opt);
    });
  }
}

// ==========================================
// 7. DASHBOARD LOGIC & RENDERING
// ==========================================

function renderDashboard() {
  const currentMonthTx = State.transactions.filter(t => t.date && t.date.startsWith(State.selectedMonth));

  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  const categorySpending = {}; // catId -> amount

  currentMonthTx.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'INCOME') {
      totalIncome += amt;
      incomeCount++;
    } else {
      totalExpense += amt;
      expenseCount++;
      categorySpending[t.categoryId] = (categorySpending[t.categoryId] || 0) + amt;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netBalance / totalIncome) * 100)) : 0;

  // Stat Cards
  document.getElementById('stat-total-income').textContent = formatINR(totalIncome);
  document.getElementById('stat-income-tx-count').textContent = `${incomeCount} entries this month`;

  document.getElementById('stat-total-expense').textContent = formatINR(totalExpense);
  document.getElementById('stat-expense-tx-count').textContent = `${expenseCount} expenses recorded`;

  const netEl = document.getElementById('stat-net-balance');
  netEl.textContent = formatINR(netBalance);
  netEl.className = 'metric-value currency-font ' + (netBalance >= 0 ? 'text-income' : 'text-expense');

  const savingsRateEl = document.getElementById('stat-savings-rate');
  savingsRateEl.textContent = `${savingsRate}% Savings Rate`;
  savingsRateEl.style.background = savingsRate >= 20 ? 'var(--income-subtle)' : 'var(--expense-subtle)';
  savingsRateEl.style.color = savingsRate >= 20 ? 'var(--income-color)' : 'var(--expense-color)';

  // Budget Stat
  renderDashboardBudgetStatus(totalExpense);

  // Category Breakdown & Chart
  renderCategoryBreakdown(categorySpending, totalExpense);

  // 6-Month Cashflow Chart
  renderCashflowHistoryChart();

  // Recent 5 Transactions
  renderDashboardRecentTransactions(currentMonthTx);
}

function renderDashboardBudgetStatus(totalExpense) {
  let categoryBudgetSum = 0;
  Object.values(State.budgets).forEach(b => categoryBudgetSum += Number(b) || 0);

  const effectiveBudget = State.monthlyBudget > 0 ? State.monthlyBudget : categoryBudgetSum;

  const textEl = document.getElementById('stat-budget-progress-text');
  const barEl = document.getElementById('dashboard-budget-bar');
  const remEl = document.getElementById('stat-budget-remaining');

  if (effectiveBudget === 0) {
    textEl.textContent = '0%';
    barEl.style.width = '0%';
    remEl.textContent = 'No budget cap set';
    return;
  }

  const pct = Math.round((totalExpense / effectiveBudget) * 100);
  textEl.textContent = `${pct}%`;
  barEl.style.width = `${Math.min(pct, 100)}%`;

  if (pct > 100) {
    barEl.style.background = 'var(--expense-color)';
    remEl.textContent = `Exceeded by ${formatINR(totalExpense - effectiveBudget)}`;
    remEl.style.color = 'var(--expense-color)';
  } else if (pct >= 80) {
    barEl.style.background = 'var(--warning-color)';
    remEl.textContent = `${formatINR(effectiveBudget - totalExpense)} remaining`;
    remEl.style.color = 'var(--warning-color)';
  } else {
    barEl.style.background = 'var(--income-color)';
    remEl.textContent = `${formatINR(effectiveBudget - totalExpense)} remaining of ${formatINR(effectiveBudget)}`;
    remEl.style.color = 'var(--text-muted)';
  }
}

function renderCategoryBreakdown(categorySpending, totalExpense) {
  const container = document.getElementById('dashboard-category-bars');
  container.innerHTML = '';

  const entries = Object.entries(categorySpending).map(([catId, amount]) => {
    const cat = State.categories.find(c => c.id === catId) || { name: 'Unknown', color: '#64748b' };
    return {
      catId,
      name: cat.name,
      color: cat.color || '#6366f1',
      icon: cat.icon || '🏷️',
      amount,
      percentage: totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0
    };
  }).sort((a, b) => b.amount - a.amount);

  document.getElementById('category-breakdown-count').textContent = `${entries.length} Categories`;
  document.getElementById('doughnut-center-amount').textContent = formatINR(totalExpense);

  if (entries.length === 0) {
    container.innerHTML = '<p class="text-muted text-center" style="margin-top: 2rem;">No expense transactions recorded for this month.</p>';
  } else {
    entries.forEach(item => {
      const row = document.createElement('div');
      row.className = 'category-bar-item';
      row.innerHTML = `
        <div class="cat-bar-header">
          <span class="cat-bar-name">
            <span class="cat-bar-dot" style="background-color: ${item.color}"></span>
            ${item.icon} ${item.name} (${item.percentage}%)
          </span>
          <span class="cat-bar-amount currency-font">${formatINR(item.amount)}</span>
        </div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width: ${item.percentage}%; background-color: ${item.color}"></div>
        </div>
      `;
      container.appendChild(row);
    });
  }

  // Update Doughnut Chart
  renderDashboardCharts(entries, totalExpense);
}

function renderDashboardCharts(categoryEntries, totalExpense) {
  const isDark = State.theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  // 1. Doughnut Chart
  const doughnutCanvas = document.getElementById('category-doughnut-chart');
  if (doughnutCanvas) {
    if (State.charts.categoryDoughnut) {
      State.charts.categoryDoughnut.destroy();
    }

    const labels = categoryEntries.map(e => e.name);
    const data = categoryEntries.map(e => e.amount);
    const colors = categoryEntries.map(e => e.color);

    State.charts.categoryDoughnut = new Chart(doughnutCanvas, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['No Spends'],
        datasets: [{
          data: data.length ? data : [1],
          backgroundColor: colors.length ? colors : [isDark ? '#262d3a' : '#e2e8f0'],
          borderWidth: 2,
          borderColor: isDark ? '#141720' : '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.raw;
                return ` ${context.label}: ${formatINR(val)}`;
              }
            }
          }
        }
      }
    });
  }
}

function renderCashflowHistoryChart() {
  const canvas = document.getElementById('cashflow-bar-chart');
  if (!canvas) return;

  if (State.charts.cashflowBar) {
    State.charts.cashflowBar.destroy();
  }

  // Build last 6 months data
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    months.push({ key: mStr, label });
  }

  const incomeData = [];
  const expenseData = [];

  months.forEach(m => {
    let inc = 0;
    let exp = 0;
    State.transactions.forEach(t => {
      if (t.date && t.date.startsWith(m.key)) {
        if (t.type === 'INCOME') inc += Number(t.amount) || 0;
        else exp += Number(t.amount) || 0;
      }
    });
    incomeData.push(inc);
    expenseData.push(exp);
  });

  const isDark = State.theme === 'dark';
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  State.charts.cashflowBar = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: 'Inflow',
          data: incomeData,
          backgroundColor: isDark ? '#34d399' : '#2d6a4f',
          borderRadius: 4
        },
        {
          label: 'Outflow',
          data: expenseData,
          backgroundColor: isDark ? '#f87171' : '#b84a39',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatINR(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: 'Plus Jakarta Sans' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            callback: (val) => formatAmountCompactINR(val)
          }
        }
      }
    }
  });
}

function renderDashboardRecentTransactions(currentMonthTx) {
  const tbody = document.getElementById('dashboard-recent-tx-body');
  const emptyState = document.getElementById('dashboard-empty-tx');
  tbody.innerHTML = '';

  const recent = [...currentMonthTx]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recent.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  recent.forEach(t => {
    const cat = State.categories.find(c => c.id === t.categoryId) || { name: 'Unknown', color: '#64748b', icon: '🏷️' };
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDateDisplay(t.date)}</td>
      <td>
        <div style="font-weight: 600; color: var(--text-main);">${escapeHTML(t.title) || 'Untitled'}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; margin-top: 2px;">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${cat.color}"></span>
          ${escapeHTML(cat.name)}
          ${t.note ? `<span>• ${escapeHTML(t.note)}</span>` : ''}
        </div>
      </td>
      <td><span class="badge badge-payment">${formatPaymentLabel(t.paymentMethod)}</span></td>
      <td>
        <span class="badge ${t.type === 'INCOME' ? 'badge-income' : 'badge-expense'}">
          ${t.type === 'INCOME' ? 'Inflow' : 'Outflow'}
        </span>
      </td>
      <td class="text-right currency-font" style="font-weight: 700; color: ${t.type === 'INCOME' ? 'var(--income-color)' : 'var(--expense-color)'}">
        ${t.type === 'INCOME' ? '+' : '-'}${formatINR(t.amount, true)}
      </td>
      <td class="text-center">
        <button class="btn btn-ghost btn-sm" onclick="editTransaction('${t.id}')">Edit</button>
        <button class="btn btn-ghost btn-sm text-danger" onclick="deleteTransaction('${t.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 8. TRANSACTIONS TABLE & ADVANCED FILTERS
// ==========================================

function renderTransactionsTable() {
  const tbody = document.getElementById('transactions-full-body');
  const emptyState = document.getElementById('tx-empty-state');
  tbody.innerHTML = '';

  let filtered = [...State.transactions];

  // Apply Search
  if (State.filters.search) {
    const q = State.filters.search;
    filtered = filtered.filter(t => 
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.note && t.note.toLowerCase().includes(q)) ||
      String(t.amount).includes(q)
    );
  }

  // Type Filter
  if (State.filters.type !== 'ALL') {
    filtered = filtered.filter(t => t.type === State.filters.type);
  }

  // Category Filter
  if (State.filters.category !== 'ALL') {
    filtered = filtered.filter(t => t.categoryId === State.filters.category);
  }

  // Payment Filter
  if (State.filters.payment !== 'ALL') {
    filtered = filtered.filter(t => t.paymentMethod === State.filters.payment);
  }

  // Date Range Filters
  if (State.filters.startDate) {
    filtered = filtered.filter(t => t.date >= State.filters.startDate);
  }
  if (State.filters.endDate) {
    filtered = filtered.filter(t => t.date <= State.filters.endDate);
  }

  // Sort by date descending
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Compute Filter Stats
  let filterIncome = 0;
  let filterExpense = 0;
  filtered.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'INCOME') filterIncome += amt;
    else filterExpense += amt;
  });

  document.getElementById('filtered-count').textContent = filtered.length;
  document.getElementById('filtered-income').textContent = formatINR(filterIncome);
  document.getElementById('filtered-expense').textContent = formatINR(filterExpense);
  const filterNet = filterIncome - filterExpense;
  const filterNetEl = document.getElementById('filtered-net');
  filterNetEl.textContent = formatINR(filterNet);
  filterNetEl.className = 'currency-font ' + (filterNet >= 0 ? 'text-income' : 'text-expense');

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / State.pageSize) || 1;
  if (State.currentPage > totalPages) State.currentPage = totalPages;

  const startIndex = (State.currentPage - 1) * State.pageSize;
  const pageItems = filtered.slice(startIndex, startIndex + State.pageSize);

  if (totalItems === 0) {
    emptyState.style.display = 'block';
    document.getElementById('tx-pagination-bar').style.display = 'none';
    return;
  }
  emptyState.style.display = 'none';
  document.getElementById('tx-pagination-bar').style.display = 'flex';

  document.getElementById('pagination-info').textContent = 
    `Showing ${startIndex + 1} to ${Math.min(startIndex + State.pageSize, totalItems)} of ${totalItems} entries`;
  document.getElementById('current-page-num').textContent = State.currentPage;
  document.getElementById('btn-prev-page').disabled = State.currentPage === 1;
  document.getElementById('btn-next-page').disabled = State.currentPage === totalPages;

  pageItems.forEach(t => {
    const cat = State.categories.find(c => c.id === t.categoryId) || { name: 'Unknown', color: '#64748b', icon: '🏷️' };
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDateDisplay(t.date)}</td>
      <td>
        <div style="font-weight: 600; color: var(--text-main);">${escapeHTML(t.title) || 'Untitled'}</div>
        ${t.note ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${escapeHTML(t.note)}</div>` : ''}
      </td>
      <td>
        <span class="badge" style="background: rgba(${hexToRgb(cat.color || '#2b3a42')}, 0.1); color: ${cat.color}; border: 1px solid rgba(${hexToRgb(cat.color || '#2b3a42')}, 0.25)">
          ${escapeHTML(cat.name)}
        </span>
      </td>
      <td><span class="badge badge-payment">${formatPaymentLabel(t.paymentMethod)}</span></td>
      <td>
        <span class="badge ${t.type === 'INCOME' ? 'badge-income' : 'badge-expense'}">
          ${t.type === 'INCOME' ? 'Inflow' : 'Outflow'}
        </span>
      </td>
      <td class="text-right currency-font" style="font-weight: 700; color: ${t.type === 'INCOME' ? 'var(--income-color)' : 'var(--expense-color)'}">
        ${t.type === 'INCOME' ? '+' : '-'}${formatINR(t.amount, true)}
      </td>
      <td class="text-center">
        <button class="btn btn-ghost btn-sm" onclick="editTransaction('${t.id}')">Edit</button>
        <button class="btn btn-ghost btn-sm text-danger" onclick="deleteTransaction('${t.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function resetFilters() {
  State.filters = {
    search: '',
    type: 'ALL',
    category: 'ALL',
    payment: 'ALL',
    startDate: '',
    endDate: ''
  };
  document.getElementById('tx-search-input').value = '';
  document.getElementById('tx-filter-type').value = 'ALL';
  document.getElementById('tx-filter-category').value = 'ALL';
  document.getElementById('tx-filter-payment').value = 'ALL';
  document.getElementById('tx-filter-start-date').value = '';
  document.getElementById('tx-filter-end-date').value = '';
  State.currentPage = 1;
  renderTransactionsTable();
  showToast('Filters cleared', 'info');
}

// ==========================================
// 9. MONTHLY BUDGETS VIEW
// ==========================================

function renderBudgets() {
  const grid = document.getElementById('budgets-category-grid');
  const emptyState = document.getElementById('budgets-empty-state');
  grid.innerHTML = '';

  const budgetEntries = Object.entries(State.budgets);

  if (budgetEntries.length === 0) {
    emptyState.style.display = 'block';
    const emptyDesc = document.getElementById('budgets-empty-desc');
    if (emptyDesc) {
      if (State.monthlyBudget > 0) {
        emptyDesc.textContent = `Your overall monthly limit of ${formatINR(State.monthlyBudget)} is active above. You can optionally add category-specific watch limits below.`;
      } else {
        emptyDesc.textContent = 'Set an overall monthly spending limit above, or assign category-specific caps to keep cash flow disciplined.';
      }
    }
  } else {
    emptyState.style.display = 'none';
  }

  // Calculate current month spending per category and overall total
  const currentMonthTx = State.transactions.filter(t => t.date && t.date.startsWith(State.selectedMonth) && t.type === 'EXPENSE');
  const spentPerCat = {};
  let totalAllExpensesThisMonth = 0;
  let totalSpentAcrossBudgets = 0;
  let totalAllocatedCategoryBudget = 0;

  currentMonthTx.forEach(t => {
    const amt = Number(t.amount || 0);
    totalAllExpensesThisMonth += amt;
    spentPerCat[t.categoryId] = (spentPerCat[t.categoryId] || 0) + amt;
  });

  const hasOverallBudget = State.monthlyBudget > 0;

  budgetEntries.forEach(([catId, cap]) => {
    const budgetCap = Number(cap) || 0;
    const spent = spentPerCat[catId] || 0;
    totalAllocatedCategoryBudget += budgetCap;
    totalSpentAcrossBudgets += spent;

    const cat = State.categories.find(c => c.id === catId) || { name: 'Unknown Category', color: '#6366f1', icon: '🏷️' };
    const pct = Math.round((spent / budgetCap) * 100);

    let progressColor = 'var(--income-color)';
    let statusText = `${pct}% Used`;
    if (pct > 100) {
      progressColor = 'var(--expense-color)';
      statusText = `⚠️ Exceeded by ${formatINR(spent - budgetCap)}`;
    } else if (pct >= 80) {
      progressColor = 'var(--warning-color)';
      statusText = `⚡ Close to Limit (${pct}%)`;
    }

    const catShare = hasOverallBudget && State.monthlyBudget > 0
      ? `<span class="text-secondary" style="font-size: 0.725rem; font-weight: 500;">(${Math.round((budgetCap / State.monthlyBudget) * 100)}% of master cap)</span>`
      : '';

    const card = document.createElement('div');
    card.className = 'budget-cat-card';
    card.innerHTML = `
      <div class="budget-cat-header">
        <div class="budget-cat-title">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${cat.color || '#2b3a42'}"></span>
          <span>${cat.name}</span>
        </div>
        <div class="budget-cat-actions">
          <button class="btn btn-ghost btn-sm" onclick="editBudget('${catId}', ${budgetCap})">Edit</button>
          <button class="btn btn-ghost btn-sm text-danger" onclick="deleteBudget('${catId}')">&times;</button>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 0.25rem;">
        <div>
          <span class="currency-font" style="font-size: 1.35rem; font-weight: 700; color: var(--text-primary);">${formatINR(spent)}</span>
          <span class="text-muted" style="font-size: 0.85rem;">of ${formatINR(budgetCap)}</span>
        </div>
        ${catShare}
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width: ${Math.min(pct, 100)}%; background: ${progressColor};"></div>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 0.775rem; color: var(--text-muted);">
        <span style="color: ${progressColor}; font-weight: 600;">${statusText}</span>
        <span>${pct <= 100 ? `${formatINR(budgetCap - spent)} left` : 'Over budget'}</span>
      </div>
    `;
    grid.appendChild(card);
  });

  // Effective Overall Budget:
  // If State.monthlyBudget is configured (> 0), it acts as the master monthly limit for ALL expenses!
  // Otherwise, fall back to the sum of category budgets.
  const effectiveBudget = hasOverallBudget ? State.monthlyBudget : totalAllocatedCategoryBudget;
  const effectiveSpent = hasOverallBudget ? totalAllExpensesThisMonth : totalSpentAcrossBudgets;

  const typeLabelEl = document.getElementById('budget-summary-type-label');
  if (typeLabelEl) {
    typeLabelEl.textContent = hasOverallBudget 
      ? 'Total Monthly Spend vs Overall Budget' 
      : (totalAllocatedCategoryBudget > 0 ? 'Total Monthly Spend vs Category Budgets' : 'Total Monthly Spend vs Total Budget');
  }

  const editCapBtnText = document.getElementById('btn-edit-monthly-cap-text');
  if (editCapBtnText) {
    editCapBtnText.textContent = hasOverallBudget ? `Edit Limit (${formatINR(State.monthlyBudget)})` : 'Set Monthly Budget';
  }

  document.getElementById('budget-sum-spent').textContent = formatINR(effectiveSpent);
  document.getElementById('budget-sum-allocated').textContent = formatINR(effectiveBudget);
  
  const overallPct = effectiveBudget > 0 ? Math.round((effectiveSpent / effectiveBudget) * 100) : 0;
  const overallBadge = document.getElementById('budget-overall-status-badge');
  overallBadge.textContent = effectiveBudget > 0 ? `${overallPct}% Used` : 'No Budget Set';
  overallBadge.style.color = overallPct > 100 ? 'var(--expense-color)' : (overallPct >= 80 ? 'var(--warning-color)' : 'var(--income-color)');

  const overallBar = document.getElementById('budget-overall-bar');
  overallBar.style.width = `${Math.min(overallPct, 100)}%`;
  overallBar.style.background = overallPct > 100 ? 'var(--expense-color)' : (overallPct >= 80 ? 'var(--warning-color)' : 'var(--income-color)');

  const remCalc = document.getElementById('budget-remaining-calc');
  if (effectiveBudget === 0) {
    remCalc.textContent = 'No monthly limit set. Click "Set Monthly Budget" to begin.';
    remCalc.className = 'text-muted';
  } else if (effectiveSpent > effectiveBudget) {
    remCalc.textContent = `Overspent by ${formatINR(effectiveSpent - effectiveBudget)}`;
    remCalc.className = 'text-danger';
  } else {
    remCalc.textContent = `${formatINR(effectiveBudget - effectiveSpent)} Available to spend`;
    remCalc.className = '';
  }

  // Envelope Allocation Strip Logic:
  // Shows how category budgets are slices carved directly out of the master monthly budget
  const stripEl = document.getElementById('budget-allocation-strip');
  if (stripEl) {
    if (hasOverallBudget) {
      stripEl.style.display = 'flex';
      const unallocated = State.monthlyBudget - totalAllocatedCategoryBudget;
      const allocPct = Math.round((totalAllocatedCategoryBudget / State.monthlyBudget) * 100);

      const pillTotal = document.getElementById('alloc-pill-total');
      if (pillTotal) pillTotal.textContent = `Master Cap: ${formatINR(State.monthlyBudget)}`;

      const pillAssigned = document.getElementById('alloc-pill-assigned');
      if (pillAssigned) pillAssigned.textContent = `Category Envelopes: ${formatINR(totalAllocatedCategoryBudget)} (${allocPct}%)`;

      const unassignedPill = document.getElementById('alloc-pill-unassigned');
      const warningEl = document.getElementById('alloc-warning');
      const warningTextEl = document.getElementById('alloc-warning-text');

      if (unallocated >= 0) {
        if (unassignedPill) {
          unassignedPill.textContent = `Unallocated Buffer: ${formatINR(unallocated)}`;
          unassignedPill.className = 'allocation-pill pill-unassigned';
        }
        if (warningEl) warningEl.style.display = 'none';
      } else {
        const excess = Math.abs(unallocated);
        if (unassignedPill) {
          unassignedPill.textContent = `Over-allocated by ${formatINR(excess)}`;
          unassignedPill.className = 'allocation-pill pill-overflow';
        }
        if (warningEl) warningEl.style.display = 'flex';
        if (warningTextEl) {
          warningTextEl.textContent = `Category caps (${formatINR(totalAllocatedCategoryBudget)}) exceed overall monthly budget (${formatINR(State.monthlyBudget)}) by ${formatINR(excess)}`;
        }
      }
    } else {
      stripEl.style.display = 'none';
    }
  }

  // Days left in current month calculation
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(0, lastDay - now.getDate());
  document.getElementById('budget-days-left').textContent = `${daysLeft} days remaining this month`;
}

function openMonthlyBudgetModal() {
  const modal = document.getElementById('modal-monthly-budget');
  if (!modal) return;
  const input = document.getElementById('overall-budget-amount-input');
  const btnRemove = document.getElementById('btn-remove-monthly-budget');
  if (input) {
    input.value = (State.monthlyBudget && State.monthlyBudget > 0) ? State.monthlyBudget : '';
  }
  if (btnRemove) {
    btnRemove.style.display = (State.monthlyBudget && State.monthlyBudget > 0) ? 'inline-flex' : 'none';
  }
  modal.classList.add('active');
  if (input) {
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }
}

function closeMonthlyBudgetModal() {
  const modal = document.getElementById('modal-monthly-budget');
  if (modal) modal.classList.remove('active');
}

function handleMonthlyBudgetSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('overall-budget-amount-input');
  const amt = input ? (parseFloat(input.value) || 0) : 0;
  State.monthlyBudget = amt;
  saveData();
  closeMonthlyBudgetModal();
  renderBudgets();
  renderDashboard();
  if (amt > 0) {
    showToast(`Overall monthly budget set to ${formatINR(amt)}`, 'success');
  } else {
    showToast('Overall monthly budget cleared', 'info');
  }
}

function removeMonthlyBudget() {
  State.monthlyBudget = 0;
  saveData();
  closeMonthlyBudgetModal();
  renderBudgets();
  renderDashboard();
  showToast('Overall monthly budget removed', 'info');
}

// Bind to window for guaranteed inline onclick and global accessibility
window.openMonthlyBudgetModal = openMonthlyBudgetModal;
window.closeMonthlyBudgetModal = closeMonthlyBudgetModal;
window.handleMonthlyBudgetSubmit = handleMonthlyBudgetSubmit;
window.removeMonthlyBudget = removeMonthlyBudget;

function handleBudgetSubmit(e) {
  e.preventDefault();
  const catId = document.getElementById('budget-category-select').value;
  const amt = parseFloat(document.getElementById('budget-amount-input').value);

  if (!catId || isNaN(amt) || amt <= 0) {
    showToast('Please enter a valid budget amount', 'error');
    return;
  }

  State.budgets[catId] = amt;
  saveData();
  closeBudgetModal();
  renderBudgets();
  renderDashboard();
  showToast('Category budget updated successfully', 'success');
}

function editBudget(catId, currentAmt) {
  openBudgetModal(catId);
  document.getElementById('budget-category-select').value = catId;
  const amtInput = document.getElementById('budget-amount-input');
  if (amtInput) {
    amtInput.value = currentAmt;
    if (amtInput.oninput) amtInput.oninput();
  }
}

function deleteBudget(catId) {
  if (confirm('Remove this category budget limit?')) {
    delete State.budgets[catId];
    saveData();
    renderBudgets();
    renderDashboard();
    showToast('Budget limit removed', 'info');
  }
}

window.handleBudgetSubmit = handleBudgetSubmit;
window.editBudget = editBudget;
window.deleteBudget = deleteBudget;

// ==========================================
// 10. CATEGORIES MANAGER
// ==========================================

function renderCategories() {
  const expList = document.getElementById('expense-category-list');
  const incList = document.getElementById('income-category-list');
  expList.innerHTML = '';
  incList.innerHTML = '';

  const expenses = State.categories.filter(c => c.type === 'EXPENSE');
  const incomes = State.categories.filter(c => c.type === 'INCOME');

  document.getElementById('expense-cat-count').textContent = expenses.length;
  document.getElementById('income-cat-count').textContent = incomes.length;

  expenses.forEach(cat => renderCategoryItem(cat, expList));
  incomes.forEach(cat => renderCategoryItem(cat, incList));
}

function renderCategoryItem(cat, container) {
  // Count transactions using this category
  const count = State.transactions.filter(t => t.categoryId === cat.id).length;

  const item = document.createElement('div');
  item.className = 'category-item';
  item.innerHTML = `
    <div class="cat-item-left">
      <span class="cat-color-dot" style="background-color: ${cat.color || '#2b3a42'};"></span>
      <span class="cat-item-name">${cat.name}</span>
    </div>
    <div class="cat-item-right">
      <span class="badge badge-neutral" style="font-size: 0.725rem;">${count} entries</span>
      ${!cat.isDefault ? `<button class="btn btn-ghost btn-sm text-danger" onclick="deleteCategory('${cat.id}')">Delete</button>` : '<span class="text-muted" style="font-size: 0.68rem; font-weight: 600; letter-spacing: 0.05em;">DEFAULT</span>'}
    </div>
  `;
  container.appendChild(item);
}

function handleCategorySubmit(e) {
  e.preventDefault();
  const name = document.getElementById('cat-name-input').value.trim();
  const type = document.querySelector('input[name="cat-type"]:checked').value;
  const color = document.getElementById('cat-color-input').value;

  if (!name) {
    showToast('Please enter category name', 'error');
    return;
  }

  // Duplicate check
  const exists = State.categories.some(c => c.type === type && c.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    showToast(`A category named "${name}" already exists`, 'error');
    return;
  }

  const newCat = {
    id: 'cat-custom-' + Date.now(),
    name,
    type,
    color,
    icon: type === 'INCOME' ? '💵' : '🏷️',
    isDefault: false
  };

  State.categories.push(newCat);
  saveData();
  closeCategoryModal();
  populateCategorySelects(type);
  renderCategories();
  renderAllViews();
  showToast(`Created category "${name}"`, 'success');
}

function deleteCategory(catId) {
  const usageCount = State.transactions.filter(t => t.categoryId === catId).length;
  if (usageCount > 0) {
    showToast(`Cannot delete: ${usageCount} transactions are linked to this category`, 'error');
    return;
  }

  if (confirm('Delete this custom category?')) {
    State.categories = State.categories.filter(c => c.id !== catId);
    delete State.budgets[catId];
    saveData();
    populateCategorySelects();
    renderCategories();
    showToast('Category deleted', 'info');
  }
}

// ==========================================
// 11. ANALYTICS & INSIGHTS VIEW
// ==========================================

function renderAnalytics() {
  const timeframe = document.getElementById('analytics-timeframe-select').value;
  let monthsCount = timeframe === 'ALL' ? 24 : parseInt(timeframe, 10);

  // 1. History Flow Chart
  renderAnalyticsFlowChart(monthsCount);

  // 2. Payment Method Share Chart
  renderAnalyticsPaymentChart();

  // 3. Highlight Stats Strip
  renderAnalyticsStats();
}

function renderAnalyticsFlowChart(monthsCount) {
  const canvas = document.getElementById('analytics-flow-chart');
  if (!canvas) return;

  if (State.charts.analyticsFlow) {
    State.charts.analyticsFlow.destroy();
  }

  const months = [];
  const now = new Date();
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    months.push({ key: mStr, label });
  }

  const incomeData = [];
  const expenseData = [];

  months.forEach(m => {
    let inc = 0;
    let exp = 0;
    State.transactions.forEach(t => {
      if (t.date && t.date.startsWith(m.key)) {
        if (t.type === 'INCOME') inc += Number(t.amount) || 0;
        else exp += Number(t.amount) || 0;
      }
    });
    incomeData.push(inc);
    expenseData.push(exp);
  });

  const isDark = State.theme === 'dark';
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  State.charts.analyticsFlow = new Chart(canvas, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: 'Total Inflow',
          data: incomeData,
          borderColor: isDark ? '#34d399' : '#2d6a4f',
          backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(45, 106, 79, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3
        },
        {
          label: 'Total Outflow',
          data: expenseData,
          borderColor: isDark ? '#f87171' : '#b84a39',
          backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(184, 74, 57, 0.06)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor, font: { weight: '600' } } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatINR(ctx.raw)}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor } },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            callback: (v) => formatAmountCompactINR(v)
          }
        }
      }
    }
  });
}

function renderAnalyticsPaymentChart() {
  const canvas = document.getElementById('analytics-payment-chart');
  if (!canvas) return;

  if (State.charts.analyticsPayment) {
    State.charts.analyticsPayment.destroy();
  }

  const paymentTotals = {
    UPI: 0,
    CARD: 0,
    NET_BANKING: 0,
    CASH: 0,
    BANK_TRANSFER: 0
  };

  State.transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
    const mode = t.paymentMethod || 'UPI';
    paymentTotals[mode] = (paymentTotals[mode] || 0) + Number(t.amount || 0);
  });

  const isDark = State.theme === 'dark';
  const textColor = isDark ? '#cbd5e1' : '#475569';

  State.charts.analyticsPayment = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: ['UPI (GPay/PhonePe)', 'Card', 'Net Banking', 'Cash', 'Bank Transfer'],
      datasets: [{
        data: [
          paymentTotals.UPI,
          paymentTotals.CARD,
          paymentTotals.NET_BANKING,
          paymentTotals.CASH,
          paymentTotals.BANK_TRANSFER
        ],
        backgroundColor: isDark
          ? ['#34d399', '#60a5fa', '#a78bfa', '#fbbf24', '#f87171']
          : ['#2d6a4f', '#3d5a80', '#2b3a42', '#c4823f', '#7d766c'],
        borderWidth: 1,
        borderColor: isDark ? '#141720' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatINR(ctx.raw)}`
          }
        }
      }
    }
  });
}

function renderAnalyticsStats() {
  const strip = document.getElementById('analytics-stat-strip');
  strip.innerHTML = '';

  let totalIncomeAll = 0;
  let totalExpenseAll = 0;
  let maxExpenseTx = null;

  const catSpending = {};

  State.transactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'INCOME') {
      totalIncomeAll += amt;
    } else {
      totalExpenseAll += amt;
      catSpending[t.categoryId] = (catSpending[t.categoryId] || 0) + amt;
      if (!maxExpenseTx || amt > maxExpenseTx.amount) {
        maxExpenseTx = t;
      }
    }
  });

  let topCatName = 'None';
  let topCatAmt = 0;
  Object.entries(catSpending).forEach(([cId, amt]) => {
    if (amt > topCatAmt) {
      topCatAmt = amt;
      const c = State.categories.find(cat => cat.id === cId);
      if (c) topCatName = c.name;
    }
  });

  const stats = [
    {
      label: 'Cumulative Net Savings',
      value: formatINR(totalIncomeAll - totalExpenseAll),
      sub: totalIncomeAll >= totalExpenseAll ? 'All-time surplus' : 'All-time deficit',
      color: totalIncomeAll >= totalExpenseAll ? 'text-income' : 'text-expense',
      badge: 'Savings'
    },
    {
      label: 'Highest Spend Category',
      value: topCatName,
      sub: topCatAmt > 0 ? formatINR(topCatAmt) : 'No spends recorded',
      color: '',
      badge: 'Top Outflow'
    },
    {
      label: 'Single Largest Expense',
      value: maxExpenseTx ? formatINR(maxExpenseTx.amount) : '₹0',
      sub: maxExpenseTx ? (maxExpenseTx.title || 'Expense') : 'None recorded',
      color: 'text-expense',
      badge: 'Peak Outflow'
    },
    {
      label: 'Total Tracked Transactions',
      value: State.transactions.length.toString(),
      sub: 'Lifetime ledger entries',
      color: '',
      badge: 'Volume'
    }
  ];

  stats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'analytics-stat-card';
    card.innerHTML = `
      <div class="analytics-stat-header">
        <span class="analytics-stat-label">${s.label}</span>
        <span class="badge badge-neutral" style="font-size: 0.65rem;">${s.badge}</span>
      </div>
      <div class="analytics-stat-val currency-font ${s.color}">${s.value}</div>
      <div class="analytics-stat-sub">${s.sub}</div>
    `;
    strip.appendChild(card);
  });
}

// ==========================================
// 12. CRUD: TRANSACTIONS
// ==========================================

function openAddModal(txData = null) {
  const modal = document.getElementById('modal-transaction');
  const title = document.getElementById('modal-tx-title');
  const form = document.getElementById('tx-form');

  form.reset();
  document.getElementById('tx-amount-in-words').textContent = '';

  if (txData) {
    title.textContent = 'Edit Transaction';
    document.getElementById('tx-id-input').value = txData.id;
    if (txData.type === 'INCOME') {
      document.getElementById('tx-type-income').checked = true;
    } else {
      document.getElementById('tx-type-expense').checked = true;
    }
    populateCategorySelects(txData.type);
    document.getElementById('tx-amount').value = txData.amount;
    document.getElementById('tx-title').value = txData.title || '';
    document.getElementById('tx-category').value = txData.categoryId;
    document.getElementById('tx-date').value = txData.date;
    document.getElementById('tx-payment').value = txData.paymentMethod || 'UPI';
    document.getElementById('tx-note').value = txData.note || '';
  } else {
    title.textContent = 'Add Transaction';
    document.getElementById('tx-id-input').value = '';
    document.getElementById('tx-type-expense').checked = true;
    populateCategorySelects('EXPENSE');
    // Default date to today
    document.getElementById('tx-date').value = new Date().toISOString().substring(0, 10);
  }

  modal.classList.add('active');
  setTimeout(() => document.getElementById('tx-amount').focus(), 100);
}

function closeTxModal() {
  document.getElementById('modal-transaction').classList.remove('active');
}

function handleTxSubmit(e) {
  e.preventDefault();
  const idInput = document.getElementById('tx-id-input').value;
  const type = document.querySelector('input[name="tx-type"]:checked').value;
  const rawAmount = parseFloat(document.getElementById('tx-amount').value);
  const amount = Math.round(rawAmount * 100) / 100;
  const title = document.getElementById('tx-title').value.trim();
  const categoryId = document.getElementById('tx-category').value;
  const date = document.getElementById('tx-date').value;
  const paymentMethod = document.getElementById('tx-payment').value;
  const note = document.getElementById('tx-note').value.trim();

  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid positive amount', 'error');
    return;
  }

  if (idInput) {
    // Edit existing
    const idx = State.transactions.findIndex(t => t.id === idInput);
    if (idx !== -1) {
      State.transactions[idx] = {
        ...State.transactions[idx],
        type,
        amount,
        title,
        categoryId,
        date,
        paymentMethod,
        note,
        updatedAt: new Date().toISOString()
      };
      showToast('Transaction updated', 'success');
    }
  } else {
    // Create new
    const newTx = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type,
      amount,
      title,
      categoryId,
      date,
      paymentMethod,
      note,
      createdAt: new Date().toISOString()
    };
    State.transactions.unshift(newTx);
    showToast(`Added ${formatINR(amount)} (${title})`, 'success');
  }

  saveData();
  closeTxModal();
  populateMonthSelect();
  renderAllViews();
}

function editTransaction(id) {
  const tx = State.transactions.find(t => t.id === id);
  if (tx) {
    openAddModal(tx);
  }
}

function deleteTransaction(id) {
  const tx = State.transactions.find(t => t.id === id);
  if (!tx) return;

  if (confirm(`Delete transaction "${tx.title}" (${formatINR(tx.amount)})?`)) {
    State.transactions = State.transactions.filter(t => t.id !== id);
    saveData();
    renderAllViews();
    showToast('Transaction deleted', 'info');
  }
}

// ==========================================
// 13. MODALS HELPERS (BUDGET & CATEGORY)
// ==========================================

function openBudgetModal(editingCatId = null) {
  const modal = document.getElementById('modal-budget');
  if (!modal) return;
  modal.classList.add('active');
  const form = document.getElementById('budget-form');
  if (form) form.reset();

  populateCategorySelects();

  // Envelope Helper Banner
  const helperEl = document.getElementById('budget-envelope-helper');
  const hintEl = document.getElementById('budget-amount-envelope-hint');
  const amtInput = document.getElementById('budget-amount-input');

  let otherAllocations = 0;
  Object.entries(State.budgets).forEach(([cid, val]) => {
    if (cid !== editingCatId) {
      otherAllocations += Number(val) || 0;
    }
  });

  if (State.monthlyBudget > 0) {
    if (helperEl) {
      helperEl.style.display = 'flex';
      const available = Math.max(0, State.monthlyBudget - otherAllocations);
      const overallEl = document.getElementById('env-modal-overall');
      const availEl = document.getElementById('env-modal-available');
      if (overallEl) overallEl.textContent = formatINR(State.monthlyBudget);
      if (availEl) availEl.textContent = formatINR(available);
    }

    const updateLiveHint = () => {
      const val = parseFloat(amtInput.value) || 0;
      const totalAfter = otherAllocations + val;
      const remaining = State.monthlyBudget - totalAfter;

      if (!hintEl) return;
      if (val === 0) {
        hintEl.textContent = `Carved out of your ${formatINR(State.monthlyBudget)} overall monthly budget.`;
        hintEl.style.color = 'var(--text-muted)';
      } else if (remaining >= 0) {
        hintEl.textContent = `✓ Leaves ${formatINR(remaining)} unallocated buffer in your ${formatINR(State.monthlyBudget)} monthly budget.`;
        hintEl.style.color = 'var(--income-color)';
      } else {
        hintEl.textContent = `⚠️ Exceeds overall monthly budget by ${formatINR(Math.abs(remaining))}. Total category caps will be ${formatINR(totalAfter)}.`;
        hintEl.style.color = 'var(--warning-color)';
      }
    };

    if (amtInput) {
      amtInput.oninput = updateLiveHint;
      updateLiveHint();
      setTimeout(() => amtInput.focus(), 50);
    }
  } else {
    if (helperEl) helperEl.style.display = 'none';
    if (hintEl) {
      hintEl.textContent = 'You will be alerted as your spending approaches 80% and 100% of this cap.';
      hintEl.style.color = 'var(--text-muted)';
    }
    if (amtInput) {
      amtInput.oninput = null;
      setTimeout(() => amtInput.focus(), 50);
    }
  }
}

function closeBudgetModal() {
  const modal = document.getElementById('modal-budget');
  if (modal) modal.classList.remove('active');
}

window.openBudgetModal = openBudgetModal;
window.closeBudgetModal = closeBudgetModal;

function openCategoryModal() {
  document.getElementById('modal-category').classList.add('active');
  document.getElementById('category-form').reset();
}
function closeCategoryModal() {
  document.getElementById('modal-category').classList.remove('active');
}

function openSettingsModal() {
  document.getElementById('modal-settings').classList.add('active');
}
function closeSettingsModal() {
  document.getElementById('modal-settings').classList.remove('active');
}

function closeAllModals() {
  closeTxModal();
  closeBudgetModal();
  closeMonthlyBudgetModal();
  closeCategoryModal();
  closeSettingsModal();
}

// ==========================================
// 14. DATA PORTABILITY (EXPORT / IMPORT / RESET)
// ==========================================

function exportDataJSON() {
  const payload = {
    appName: 'RupeeFlow',
    version: '1.0',
    exportDate: new Date().toISOString(),
    transactions: State.transactions,
    categories: State.categories,
    budgets: State.budgets,
    monthlyBudget: State.monthlyBudget || 0
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rupeeflow_backup_${new Date().toISOString().substring(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('JSON backup downloaded', 'success');
}

function exportDataCSV() {
  if (State.transactions.length === 0) {
    showToast('No transactions to export', 'error');
    return;
  }

  const headers = ['Date', 'Title', 'Type', 'Amount (INR)', 'Category', 'Payment Mode', 'Notes'];
  const rows = State.transactions.map(t => {
    const cat = State.categories.find(c => c.id === t.categoryId) || { name: 'Unknown' };
    return [
      `"${t.date}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.type}"`,
      t.amount,
      `"${cat.name}"`,
      `"${t.paymentMethod}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rupeeflow_transactions_${new Date().toISOString().substring(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV export downloaded', 'success');
}

function importDataJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (!Array.isArray(data.transactions)) {
        throw new Error('Invalid file structure: transactions array not found');
      }

      if (confirm(`Restore ${data.transactions.length} transactions from backup? This will merge with your existing data.`)) {
        State.transactions = data.transactions;
        if (Array.isArray(data.categories)) State.categories = data.categories;
        if (data.budgets) State.budgets = data.budgets;
        if (data.monthlyBudget !== undefined) State.monthlyBudget = Number(data.monthlyBudget) || 0;
        saveData();
        closeSettingsModal();
        renderAllViews();
        showToast('Backup restored successfully!', 'success');
      }
    } catch (err) {
      showToast('Error parsing backup file: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

function startFresh() {
  if (confirm('Start fresh with 0 transactions and 0 budgets? Your categories will remain intact.')) {
    State.transactions = [];
    State.budgets = {};
    State.monthlyBudget = 0;
    saveData();
    if (window.location.protocol.startsWith('http')) {
      fetch('/api/reset', { method: 'POST' }).catch(() => {});
    }
    populateMonthSelect();
    renderAllViews();
    showToast('Started fresh! 0 transactions recorded.', 'success');
  }
}

function resetAllData() {
  if (confirm('⚠️ WARNING: This will permanently erase all your transactions and budgets! Proceed?')) {
    localStorage.removeItem('rupeeflow_transactions');
    localStorage.removeItem('rupeeflow_categories');
    localStorage.removeItem('rupeeflow_budgets');
    localStorage.removeItem('rupeeflow_monthly_budget');
    State.transactions = [];
    State.categories = DEFAULT_CATEGORIES;
    State.budgets = {};
    State.monthlyBudget = 0;
    saveData();
    if (window.location.protocol.startsWith('http')) {
      fetch('/api/reset', { method: 'POST' }).catch(() => {});
    }
    closeSettingsModal();
    populateCategorySelects();
    renderAllViews();
    showToast('All local data has been reset to fresh state', 'info');
  }
}

// ==========================================
// 15. SAMPLE DATA GENERATOR (INDIAN REALISTIC)
// ==========================================

function seedSampleTransactions(notifyUser = true) {
  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth();

  const sampleData = [
    // Current Month Income
    { id: 's-1', title: 'Monthly Salary Credit', amount: 145000, type: 'INCOME', categoryId: 'cat-salary', paymentMethod: 'BANK_TRANSFER', date: makeDate(currentY, currentM, 1), note: 'TCS Monthly Credit' },
    { id: 's-2', title: 'Consulting Project Milestone', amount: 35000, type: 'INCOME', categoryId: 'cat-freelance', paymentMethod: 'UPI', date: makeDate(currentY, currentM, 12), note: 'FinTech App UI design' },
    { id: 's-3', title: 'Quarterly Mutual Fund Dividend', amount: 4850, type: 'INCOME', categoryId: 'cat-invest-returns', paymentMethod: 'NET_BANKING', date: makeDate(currentY, currentM, 18), note: 'Nifty 50 Index Fund' },

    // Current Month Expenses
    { id: 's-4', title: 'Apartment Rent & Maintenance', amount: 26000, type: 'EXPENSE', categoryId: 'cat-rent', paymentMethod: 'NET_BANKING', date: makeDate(currentY, currentM, 2), note: '2BHK Whitefield' },
    { id: 's-5', title: 'Blinkit & Zepto Groceries', amount: 3420, type: 'EXPENSE', categoryId: 'cat-groceries', paymentMethod: 'UPI', date: makeDate(currentY, currentM, 4), note: 'Weekly kitchen staples' },
    { id: 's-6', title: 'Bescom Electricity Bill', amount: 2150, type: 'EXPENSE', categoryId: 'cat-bills', paymentMethod: 'UPI', date: makeDate(currentY, currentM, 6), note: 'Bill #BES-8921' },
    { id: 's-7', title: 'Swiggy Gourmet Dinner', amount: 1280, type: 'EXPENSE', categoryId: 'cat-food', paymentMethod: 'UPI', date: makeDate(currentY, currentM, 8), note: 'Weekend Biryani with friends' },
    { id: 's-8', title: 'SIP Mutual Fund Investment', amount: 25000, type: 'EXPENSE', categoryId: 'cat-invest', paymentMethod: 'BANK_TRANSFER', date: makeDate(currentY, currentM, 10), note: 'Auto-debit Zerodha Coin' },
    { id: 's-9', title: 'Petrol Fuel Fill-up (Shell)', amount: 3200, type: 'EXPENSE', categoryId: 'cat-transport', paymentMethod: 'CARD', date: makeDate(currentY, currentM, 11), note: 'Car full tank' },
    { id: 's-10', title: 'Amazon Great Indian Festival', amount: 6499, type: 'EXPENSE', categoryId: 'cat-shopping', paymentMethod: 'CARD', date: makeDate(currentY, currentM, 15), note: 'Ergonomic Desk Lamp' },
    { id: 's-11', title: 'Apollo Pharmacy & Vitamins', amount: 1850, type: 'EXPENSE', categoryId: 'cat-health', paymentMethod: 'UPI', date: makeDate(currentY, currentM, 17), note: 'Supplements' },
    { id: 's-12', title: 'Netflix + Spotify Family', amount: 899, type: 'EXPENSE', categoryId: 'cat-ott', paymentMethod: 'CARD', date: makeDate(currentY, currentM, 19), note: 'Monthly subscriptions' },
    { id: 's-13', title: 'Zomato Office Lunch', amount: 480, type: 'EXPENSE', categoryId: 'cat-food', paymentMethod: 'UPI', date: makeDate(currentY, currentM, 21), note: 'North Indian Thali' },

    // Previous Month (M-1)
    { id: 's-14', title: 'Salary Credit', amount: 145000, type: 'INCOME', categoryId: 'cat-salary', paymentMethod: 'BANK_TRANSFER', date: makeDate(currentY, currentM - 1, 1), note: 'Monthly Salary' },
    { id: 's-15', title: 'Apartment Rent', amount: 26000, type: 'EXPENSE', categoryId: 'cat-rent', paymentMethod: 'NET_BANKING', date: makeDate(currentY, currentM - 1, 2), note: 'Rent' },
    { id: 's-16', title: 'Groceries Supermarket', amount: 9800, type: 'EXPENSE', categoryId: 'cat-groceries', paymentMethod: 'CARD', date: makeDate(currentY, currentM - 1, 5), note: 'Monthly D-Mart run' },
    { id: 's-17', title: 'Zerodha SIP Investments', amount: 25000, type: 'EXPENSE', categoryId: 'cat-invest', paymentMethod: 'BANK_TRANSFER', date: makeDate(currentY, currentM - 1, 10), note: 'Index Funds' },
    { id: 's-18', title: 'Dining Out & Cafes', amount: 7600, type: 'EXPENSE', categoryId: 'cat-food', paymentMethod: 'UPI', date: makeDate(currentY, currentM - 1, 16), note: 'Socials' },
    { id: 's-19', title: 'Car Servicing & Fuel', amount: 8200, type: 'EXPENSE', categoryId: 'cat-transport', paymentMethod: 'CARD', date: makeDate(currentY, currentM - 1, 22), note: 'Periodic maintenance' },

    // Previous Month (M-2)
    { id: 's-20', title: 'Salary Credit', amount: 145000, type: 'INCOME', categoryId: 'cat-salary', paymentMethod: 'BANK_TRANSFER', date: makeDate(currentY, currentM - 2, 1), note: 'Monthly Salary' },
    { id: 's-21', title: 'Apartment Rent', amount: 26000, type: 'EXPENSE', categoryId: 'cat-rent', paymentMethod: 'NET_BANKING', date: makeDate(currentY, currentM - 2, 2), note: 'Rent' },
    { id: 's-22', title: 'SIP Investment', amount: 25000, type: 'EXPENSE', categoryId: 'cat-invest', paymentMethod: 'BANK_TRANSFER', date: makeDate(currentY, currentM - 2, 10), note: 'Mutual Funds' },
    { id: 's-23', title: 'Weekend Roadtrip', amount: 12500, type: 'EXPENSE', categoryId: 'cat-transport', paymentMethod: 'UPI', date: makeDate(currentY, currentM - 2, 18), note: 'Coorg Outing' }
  ];

  State.transactions = sampleData;
  saveData();
  populateMonthSelect();
  renderAllViews();

  if (notifyUser) {
    showToast('Loaded 23 realistic demo records!', 'success');
  }
}

function makeDate(year, month, day) {
  const d = new Date(year, month, day);
  return d.toISOString().substring(0, 10);
}

// ==========================================
// 16. TOAST NOTIFICATIONS & HELPERS
// ==========================================

function showToast(message, type = 'info', tag = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const iconMap = {
    success: '✅',
    error: '❌',
    info: '💡'
  };

  // Prevent spam: if a toast with this tag is already active, update it in-place instead of stacking
  if (tag) {
    const existing = container.querySelector(`[data-toast-tag="${tag}"]`);
    if (existing) {
      existing.className = `toast toast-${type}`;
      existing.innerHTML = `
        <span>${iconMap[type] || '•'}</span>
        <span>${message}</span>
      `;
      if (existing._fadeTimeout) clearTimeout(existing._fadeTimeout);
      if (existing._removeTimeout) clearTimeout(existing._removeTimeout);

      existing.style.opacity = '1';
      existing.style.transform = 'translateY(0)';

      existing._fadeTimeout = setTimeout(() => {
        existing.style.opacity = '0';
        existing.style.transform = 'translateY(10px)';
        existing.style.transition = 'all 0.25s ease';
        existing._removeTimeout = setTimeout(() => existing.remove(), 250);
      }, 2200);

      return;
    }
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  if (tag) toast.setAttribute('data-toast-tag', tag);

  toast.innerHTML = `
    <span>${iconMap[type] || '•'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  toast._fadeTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    toast._removeTimeout = setTimeout(() => toast.remove(), 250);
  }, 2200);
}

function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

// 18. PWA Service Worker & Mobile Installation
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  showToast('RupeeFlow installed successfully!', 'success');
});

function triggerPWAInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('Adding RupeeFlow to home screen...', 'success');
      }
      deferredPrompt = null;
    });
  } else {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      alert('To install on iPhone:\n1. Tap the Share icon (square with arrow) at the bottom of Safari.\n2. Tap "Add to Home Screen".');
    } else {
      alert('To install on Android / Chrome:\n1. Tap the 3 dots menu (⋮) in the top right of Chrome.\n2. Tap "Add to Home screen" or "Install app".');
    }
  }
}

window.triggerPWAInstall = triggerPWAInstall;

if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}


