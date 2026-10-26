# RupeeFlow — Personal Finance & Wealth Manager

A smart, modern, private personal finance manager built with zero-database hassle. Your data stays 100% in your local browser storage with complete backup export/import capabilities.

## 🚀 Live Local URL
The application is currently live and running locally at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## ✨ Features Built For You

1. **Indian Currency & Format First (`₹`)**:
   - Native Indian numbering system (`₹1,45,000.00`, Lakhs/Crores display tags).
   - Real-time number-to-words helper in the Add Transaction dialog.
   - Pre-configured payment methods: **UPI (Google Pay, PhonePe, Paytm)**, **Credit/Debit Card**, **Net Banking**, **Cash**, and **Bank Transfer (IMPS/NEFT)**.

2. **Zero Database Setup**:
   - Zero PostgreSQL, zero SQLite, and zero Docker configuration required.
   - All financial records are stored securely in browser `localStorage`.
   - Your data is private, fast, and works even offline.

3. **Interactive Financial Dashboard**:
   - **Metrics Overview**: Total Income, Total Expenses, Net Savings, and Monthly Budget Consumption.
   - **Expense Breakdown Chart**: Interactive Doughnut chart and category spending progress bars.
   - **6-Month Cash Flow Trends**: Side-by-side visual comparison of Income vs Expenses.
   - **Recent Transactions Log**: Quick glance at the latest financial activities with 1-click edit/delete.

4. **Transactions Management**:
   - Live multi-filter: by Type (Income/Expense), Category, Payment Method, and Custom Date Range.
   - Real-time search across titles, notes, and descriptions.
   - Live summary strip computing total filtered inflow, outflow, and net balance.
   - Pagination (15 records per page) with sorting.

5. **Monthly Category Budgets & Caps**:
   - Set monthly spending caps for individual categories (e.g., Dining: ₹12,000, Groceries: ₹10,000).
   - Color-coded alert bars:
     - 🟢 **Green** (< 80%): Safe spending.
     - 🟡 **Amber** (80% - 100%): Approaching monthly limit.
     - 🔴 **Crimson** (> 100%): Over-budget alert with exact overspent amount.

6. **Custom Categories Manager**:
   - Pre-configured Indian categories: *Salary, Freelance, Groceries, Dining, Rent, Utilities, Transport & Fuel, Shopping, Health, OTT Subscriptions, Investments & SIP, EMI & Loans*.
   - Create custom categories with color pickers and emoji icons.
   - Safety checks to prevent accidental deletion of categories linked to existing transactions.

7. **Data Portability & Peace of Mind**:
   - **1-Click Export JSON**: Full database snapshot backup.
   - **1-Click Export CSV**: Spreadsheet export compatible with Microsoft Excel and Google Sheets.
   - **Import JSON**: Restore your data anytime on any device.
   - **Sample Data Seed**: Re-populate realistic demo records anytime with 1 click.

---

## ⌨️ Helpful Shortcuts
- Press <kbd>N</kbd> on your keyboard anywhere on the page to immediately open the **Add Transaction** dialog.
- Press <kbd>Esc</kbd> to close any open modal.

---

## 🏃 Running the Application
To run RupeeFlow with **Dual Auto-Sync (saving to both browser and `expenses.json` on disk)**:
```powershell
cd c:\Users\Mayank\Documents\Antigravity\Assignments\personal-finance-manager
node server.js
```
Then visit: 👉 **[http://localhost:3000](http://localhost:3000)**

*Alternatively, you can also double-click `index.html` to run in standalone browser mode with 100% offline LocalStorage!*
